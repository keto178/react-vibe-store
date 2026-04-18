import bcrypt from 'bcryptjs'
import cors from 'cors'
import express from 'express'
import env from './config/env.js'
import { sendAdminOrderEmail } from './services/emailService.js'
import {
    createId,
    getCartForUser,
    prepareFileStore,
    readStore,
    sanitizeUser,
    writeStore
} from './services/fileStore.js'
import {
    buildFallbackRuntimeHealth,
    TEMPORARY_PREVIEW_MESSAGE
} from './services/runtimeHealth.js'
import { encryptPhoneNumber } from './services/phoneCrypto.js'
import { sendPhoneVerificationCodeSms } from './services/smsService.js'
import { signAuthToken, verifyAuthToken } from './app/services/authTokenService.js'
import {
    assertManagedAssetUrl,
    readLegacyBlobAsset,
    supportsLegacyBlobAssetReads,
    uploadAssetFromBuffer,
    uploadAssetFromDataUrl
} from './app/services/uploadService.js'
import { calculateOrderSummary } from './utils/order.js'
import {
    PHONE_OTP_LENGTH,
    PHONE_OTP_MAX_ATTEMPTS,
    PHONE_OTP_TTL_MS,
    buildPhoneVerificationRecord,
    comparePhoneVerificationCode,
    createPhoneVerificationCode,
    extractPhoneLast4,
    hashPhoneVerificationCode,
    isPhoneVerificationExpired,
    isValidPhoneNumber,
    normalizePhoneNumber
} from './utils/phoneVerification.js'

const app = express()
const ALLOWED_NICOTINE_LEVELS = [9, 12, 30, 50]
const TEMPORARY_STORAGE_WRITE_BLOCKED_MESSAGE = TEMPORARY_PREVIEW_MESSAGE

function isAllowedDevOrigin(origin) {
    return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin)
}

function isAllowedVercelOrigin(origin) {
    return /^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(origin)
}

function extractBearerToken(authorizationHeader = '') {
    if (!authorizationHeader.startsWith('Bearer ')) {
        return ''
    }

    return authorizationHeader.slice(7).trim()
}

function sanitizeNicotineLevels(levels, productType) {
    if (productType !== 'Liquid' || !Array.isArray(levels)) {
        return []
    }

    return Array.from(
        new Set(
            levels
                .map((level) => Number(level))
                .filter((level) => ALLOWED_NICOTINE_LEVELS.includes(level))
        )
    )
        .sort((firstLevel, secondLevel) => firstLevel - secondLevel)
        .slice(0, 2)
}

function normalizeCategory(category) {
    return {
        id: category.id,
        name: category.name,
        group: category.group || 'Device',
        image: category.image
    }
}

function normalizeProduct(product) {
    const colors = Array.isArray(product.colors) && product.colors.length > 0
        ? product.colors
        : [product.color || '#5dc0ff']
    const nicotineLevels = sanitizeNicotineLevels(product.nicotineLevels, product.type || 'Device')

    return {
        id: product.id,
        name: product.name,
        description: product.description,
        price: Number(product.price) || 0,
        discount: Number(product.discount) || 0,
        image: product.image,
        category: product.category,
        categoryId: product.categoryId,
        categoryImage: product.categoryImage || '',
        colors,
        nicotineLevels,
        color: colors[0],
        type: product.type || 'Device',
        rating: Number(product.rating) || 4.5,
        stockQuantity: null,
        createdAt: product.createdAt || null,
        updatedAt: product.updatedAt || null
    }
}

function normalizeCartItem(item) {
    return {
        id: item.id,
        productId: item.productId,
        categoryId: item.categoryId,
        name: item.name,
        description: item.description,
        price: Number(item.price) || 0,
        discount: Number(item.discount) || 0,
        image: item.image,
        quantity: Number(item.quantity) || 1,
        selectedColor: item.selectedColor || '#5dc0ff',
        category: item.category || '',
        type: item.type || 'Device'
    }
}

function normalizeOrder(order) {
    return {
        id: order.id,
        createdAt: order.createdAt,
        status: order.status || 'pending',
        items: Array.isArray(order.items) ? order.items.map(normalizeCartItem) : [],
        customer: {
            fullName: order.customer?.fullName || '',
            email: order.customer?.email || '',
            phone: order.customer?.phone || '',
            addressLine1: order.customer?.addressLine1 || '',
            addressLine2: order.customer?.addressLine2 || '',
            city: order.customer?.city || '',
            state: order.customer?.state || '',
            postalCode: order.customer?.postalCode || '',
            country: order.customer?.country || '',
            notes: order.customer?.notes || ''
        },
        customerSession: order.customerSession || null,
        summary: order.summary || calculateOrderSummary(order.items || []),
        emailNotification: order.emailNotification || {
            status: 'pending',
            message: ''
        },
        isNew: Boolean(order.isNew)
    }
}

function resolveCategoryGroup(groupValue, typeValue) {
    if (groupValue === 'Liquid' || typeValue === 'Liquid') {
        return 'Liquid'
    }

    return 'Device'
}

function ensureCategoryForProductRequest(store, requestBody) {
    const requestedCategoryId = typeof requestBody?.categoryId === 'string'
        ? requestBody.categoryId.trim()
        : ''
    const requestedCategoryName = typeof requestBody?.category === 'string'
        ? requestBody.category.trim()
        : ''
    const requestedCategoryGroup = resolveCategoryGroup(requestBody?.group, requestBody?.type)
    const requestedCategoryImage = typeof requestBody?.categoryImage === 'string'
        ? requestBody.categoryImage.trim()
        : ''

    if (requestedCategoryId) {
        const existingById = store.categories.find((item) => item.id === requestedCategoryId)

        if (existingById) {
            return existingById
        }
    }

    if (requestedCategoryName) {
        const existingByName = store.categories.find((item) => (
            item.name.trim().toLowerCase() === requestedCategoryName.toLowerCase() &&
            (item.group || 'Device') === requestedCategoryGroup
        ))

        if (existingByName) {
            return existingByName
        }
    }

    if (!requestedCategoryId || !requestedCategoryName) {
        return null
    }

    const now = new Date().toISOString()
    const category = {
        id: requestedCategoryId,
        name: requestedCategoryName,
        group: requestedCategoryGroup,
        image: requestedCategoryImage,
        createdAt: now,
        updatedAt: now
    }

    store.categories.push(category)

    return category
}

function sendError(res, statusCode, message) {
    res.status(statusCode).json({ message })
}

function isLegacyDataUrl(value = '') {
    return String(value || '').trim().startsWith('data:')
}

function isAllowedExistingAssetValue(nextValue, currentValue) {
    return nextValue === currentValue && isLegacyDataUrl(nextValue)
}

function sanitizeRequestBody(body) {
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
        return {}
    }

    const sanitized = {}

    for (const [key, value] of Object.entries(body)) {
        if (/password|token|secret|authorization|cookie/i.test(key)) {
            sanitized[key] = '[redacted]'
            continue
        }

        sanitized[key] = typeof value === 'string' && value.length > 200
            ? `${value.slice(0, 200)}...`
            : value
    }

    return sanitized
}

function buildRequestMeta(req) {
    return {
        method: req.method,
        path: req.originalUrl,
        requestId: req.headers['x-vercel-id'] || req.headers['x-request-id'] || '',
        ip: req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '',
        userAgent: req.headers['user-agent'] || ''
    }
}

async function authenticate(req, res, next) {
    const token = extractBearerToken(req.headers.authorization)

    if (!token) {
        sendError(res, 401, 'Authentication is required.')
        return
    }

    let decodedToken

    try {
        decodedToken = verifyAuthToken(token)
    } catch {
        sendError(res, 401, 'Your session is invalid or expired. Please log in again.')
        return
    }

    const store = await readStore()
    const user = store.users.find((item) => item.id === decodedToken.userId)

    if (!user) {
        sendError(res, 401, 'The account for this session no longer exists.')
        return
    }

    req.user = user
    next()
}

function requireAdmin(req, res, next) {
    if (req.user?.role !== 'admin') {
        sendError(res, 403, 'Admin access is required for this action.')
        return
    }

    next()
}

function requirePhoneVerified(req, res, next) {
    if (req.user?.role === 'admin' || req.user?.phoneVerified) {
        next()
        return
    }

    sendError(res, 403, 'Phone verification is required to continue.')
}

app.disable('x-powered-by')
app.use(cors({
    origin(origin, callback) {
        if (!origin || origin === env.clientOrigin) {
            callback(null, true)
            return
        }

        if (!env.isProduction && isAllowedDevOrigin(origin)) {
            callback(null, true)
            return
        }

        if (isAllowedVercelOrigin(origin)) {
            callback(null, true)
            return
        }

        callback(new Error(`Origin ${origin} is not allowed by CORS.`))
    }
}))
app.use(express.json({ limit: env.uploadMaxBytes }))
app.use(express.urlencoded({ extended: true, limit: env.uploadMaxBytes }))
app.use('/api', (req, res, next) => {
    res.set('Cache-Control', 'no-store')
    next()
})
app.use((req, res, next) => {
    const isWriteMethod = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(String(req.method || '').toUpperCase())
    const isTemporaryServerlessStore = !buildFallbackRuntimeHealth().writeAccess
    const isAllowedWriteDuringFallback = req.method === 'POST' && req.path === '/api/auth/login'

    if (!isTemporaryServerlessStore || !isWriteMethod || isAllowedWriteDuringFallback) {
        next()
        return
    }

    sendError(res, 503, TEMPORARY_STORAGE_WRITE_BLOCKED_MESSAGE)
})

app.get('/api/health', (req, res) => {
    res.json(buildFallbackRuntimeHealth())
})

app.get('/api/assets/blob', async (req, res) => {
    const pathname = String(req.query?.pathname || '').trim()

    if (!pathname) {
        sendError(res, 400, 'Blob asset pathname is required.')
        return
    }

    if (!supportsLegacyBlobAssetReads()) {
        sendError(res, 503, 'Blob asset storage is not configured for this deployment.')
        return
    }

    try {
        const assetResult = await readLegacyBlobAsset(pathname)

        if (!assetResult?.stream || assetResult.statusCode !== 200) {
            sendError(res, 404, 'Blob asset not found.')
            return
        }

        const assetBuffer = Buffer.from(await new Response(assetResult.stream).arrayBuffer())

        res.set('Cache-Control', assetResult.blob.cacheControl || 'public, max-age=31536000, immutable')
        res.set('Content-Disposition', assetResult.blob.contentDisposition || 'inline')
        res.type(assetResult.blob.contentType || 'application/octet-stream')
        res.send(assetBuffer)
    } catch (error) {
        console.error('[fallback-assets/blob] Failed to load blob asset.', {
            pathname,
            errorMessage: error.message,
            stack: error.stack || ''
        })
        sendError(res, 500, 'Unable to load the requested asset right now.')
    }
})

app.post('/api/auth/register', async (req, res) => {
    const store = await prepareFileStore()
    const username = req.body.username?.trim().toLowerCase()
    const email = req.body.email?.trim().toLowerCase()
    const password = req.body.password || ''

    if (!username || !email || !password) {
        sendError(res, 400, 'Username, email, and password are required.')
        return
    }

    if (password.length < 6) {
        sendError(res, 400, 'Password must be at least 6 characters long.')
        return
    }

    const existingUser = store.users.find((user) => (
        user.email === email || user.username === username
    ))

    if (existingUser) {
        sendError(res, 409, 'A user with this email or username already exists.')
        return
    }

    const user = {
        id: createId('usr'),
        username,
        email,
        passwordHash: await bcrypt.hash(password, 10),
        role: 'user',
        phoneNumberEncrypted: '',
        phoneNumberLast4: '',
        phoneVerified: false,
        phoneVerifiedAt: null,
        phoneVerification: {
            codeHash: '',
            attempts: 0,
            requestedAt: null,
            expiresAt: null
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    }

    store.users.push(user)
    await writeStore(store)

    res.status(201).json({
        message: 'Registration successful.',
        authMode: 'fallback',
        token: signAuthToken(user),
        user: sanitizeUser(user)
    })
})

app.post('/api/auth/login', async (req, res) => {
    const email = req.body?.email?.trim().toLowerCase()
    const password = req.body?.password || ''
    const requestMeta = buildRequestMeta(req)

    console.info('[fallback-auth/login] Received login request.', {
        ...requestMeta,
        email: email || '',
        hasPassword: Boolean(password),
        passwordLength: typeof password === 'string' ? password.length : 0
    })

    try {
        const store = await prepareFileStore()
        const user = store.users.find((item) => item.email === email)
        const isTemporaryServerlessStore = !buildFallbackRuntimeHealth().writeAccess

        if (!email || !password) {
            sendError(res, 400, 'Email and password are required.')
            return
        }

        if (!user && isTemporaryServerlessStore) {
            sendError(
                res,
                503,
                'Login is temporarily unavailable because the database connection failed and fallback storage is temporary. Please try again in a moment.'
            )
            return
        }

        if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
            sendError(res, 401, 'Incorrect email or password.')
            return
        }

        res.json({
            message: 'Login successful.',
            authMode: 'fallback',
            token: signAuthToken(user),
            user: sanitizeUser(user)
        })
    } catch (error) {
        console.error('[fallback-auth/login] Login request failed.', {
            ...requestMeta,
            email,
            requestBody: sanitizeRequestBody(req.body),
            errorMessage: error.message,
            stack: error.stack || ''
        })
        sendError(res, 500, 'Unable to process login right now. Please try again.')
    }
})

app.get('/api/auth/me', authenticate, (req, res) => {
    res.json({
        user: sanitizeUser(req.user)
    })
})

app.post(
    '/api/uploads',
    authenticate,
    requirePhoneVerified,
    express.raw({
        type: ['application/octet-stream', 'image/*'],
        limit: env.uploadMaxBytes
    }),
    async (req, res) => {
        const fileName = String(
            req.headers['x-upload-filename'] ||
            req.query?.fileName ||
            req.body?.fileName ||
            ''
        ).trim()
        const scope = String(
            req.headers['x-upload-scope'] ||
            req.query?.scope ||
            req.body?.scope ||
            'uploads'
        ).trim()
        const contentType = String(req.headers['content-type'] || '')
            .split(';', 1)[0]
            .trim()
            .toLowerCase()
        const isBinaryUpload = Buffer.isBuffer(req.body) && req.body.byteLength > 0

        try {
            const uploadResult = isBinaryUpload
                ? await uploadAssetFromBuffer({
                    buffer: req.body,
                    contentType,
                    fileName,
                    scope,
                    maxBytes: env.uploadMaxBytes
                })
                : await uploadAssetFromDataUrl({
                    dataUrl: String(req.body?.dataUrl || '').trim(),
                    fileName,
                    scope,
                    maxBytes: env.uploadMaxBytes
                })

            res.status(201).json({
                message: 'File uploaded successfully.',
                ...uploadResult
            })
        } catch (error) {
            if (!isBinaryUpload && !env.allowLegacyDataUrlUploads && String(req.body?.dataUrl || '').trim()) {
                sendError(
                    res,
                    415,
                    'Legacy data URL uploads are disabled for this environment. Upload the binary file directly instead.'
                )
                return
            }

            const statusCode = Number.isInteger(error?.statusCode) ? error.statusCode : 400
            sendError(res, statusCode, error.message || 'File upload failed.')
        }
    }
)

app.post('/api/auth/phone/request-code', authenticate, async (req, res) => {
    const normalizedPhoneNumber = normalizePhoneNumber(
        req.body?.phoneNumber || req.body?.phone || '',
        { defaultCountryCode: env.phoneDefaultCountryCode }
    )

    if (!normalizedPhoneNumber || !isValidPhoneNumber(normalizedPhoneNumber)) {
        sendError(res, 400, 'Please enter a valid phone number in international format.')
        return
    }

    const store = await readStore()
    const user = store.users.find((item) => item.id === req.user.id)

    if (!user) {
        sendError(res, 401, 'The account for this session no longer exists.')
        return
    }

    if (user.role === 'admin') {
        sendError(res, 400, 'Admin accounts do not require phone verification.')
        return
    }

    if (user.phoneVerified) {
        sendError(res, 409, 'Phone number is already verified for this account.')
        return
    }

    const verificationCode = createPhoneVerificationCode()
    const verificationCodeHash = await hashPhoneVerificationCode(verificationCode)

    user.phoneNumberEncrypted = encryptPhoneNumber(normalizedPhoneNumber)
    user.phoneNumberLast4 = extractPhoneLast4(normalizedPhoneNumber)
    user.phoneVerified = false
    user.phoneVerifiedAt = null
    user.phoneVerification = buildPhoneVerificationRecord(verificationCodeHash)
    user.updatedAt = new Date().toISOString()

    await writeStore(store)

    try {
        const deliveryResult = await sendPhoneVerificationCodeSms({
            phoneNumber: normalizedPhoneNumber,
            code: verificationCode
        })

        res.status(201).json({
            message: deliveryResult.message || (
                deliveryResult.delivery === 'sms'
                    ? 'Verification code sent by SMS.'
                    : 'SMS is not configured. Verification code is available in preview mode.'
            ),
            delivery: deliveryResult.delivery,
            otpLength: PHONE_OTP_LENGTH,
            expiresInSeconds: Math.floor(PHONE_OTP_TTL_MS / 1000),
            verificationCode: deliveryResult.verificationCode || ''
        })
    } catch (error) {
        sendError(res, 503, error.message || 'Phone verification is temporarily unavailable. Please try again later.')
    }
})

app.post('/api/auth/phone/verify-code', authenticate, async (req, res) => {
    const code = String(req.body?.code || '').trim()

    if (!/^\d{4,6}$/.test(code)) {
        sendError(res, 400, 'Please enter a valid verification code.')
        return
    }

    const store = await readStore()
    const user = store.users.find((item) => item.id === req.user.id)

    if (!user) {
        sendError(res, 401, 'The account for this session no longer exists.')
        return
    }

    if (user.role === 'admin') {
        sendError(res, 400, 'Admin accounts do not require phone verification.')
        return
    }

    if (user.phoneVerified) {
        res.json({
            message: 'Phone number already verified.',
            user: sanitizeUser(user)
        })
        return
    }

    const verificationRecord = user.phoneVerification

    if (!verificationRecord?.codeHash || !verificationRecord?.expiresAt) {
        sendError(res, 400, 'Request a verification code before confirming your phone number.')
        return
    }

    if (isPhoneVerificationExpired(verificationRecord)) {
        user.phoneVerification = {
            codeHash: '',
            attempts: 0,
            requestedAt: null,
            expiresAt: null
        }
        user.updatedAt = new Date().toISOString()
        await writeStore(store)

        sendError(res, 400, 'Verification code expired. Request a new code.')
        return
    }

    if ((Number(verificationRecord.attempts) || 0) >= PHONE_OTP_MAX_ATTEMPTS) {
        sendError(res, 429, 'Too many invalid attempts. Request a new verification code.')
        return
    }

    const isCodeValid = await comparePhoneVerificationCode(code, verificationRecord.codeHash)

    if (!isCodeValid) {
        user.phoneVerification.attempts = (Number(verificationRecord.attempts) || 0) + 1
        user.updatedAt = new Date().toISOString()
        await writeStore(store)
        sendError(res, 401, 'Invalid verification code.')
        return
    }

    if (!user.phoneNumberEncrypted || !user.phoneNumberLast4) {
        sendError(res, 400, 'Phone number data is missing. Request a new verification code.')
        return
    }

    user.phoneVerified = true
    user.phoneVerifiedAt = new Date().toISOString()
    user.phoneVerification = {
        codeHash: '',
        attempts: 0,
        requestedAt: null,
        expiresAt: null
    }
    user.updatedAt = new Date().toISOString()

    await writeStore(store)

    res.json({
        message: 'Phone number verified successfully.',
        user: sanitizeUser(user)
    })
})

app.get('/api/categories', async (req, res) => {
    const store = await prepareFileStore()
    const categories = store.categories
        .map(normalizeCategory)
        .sort((first, second) => `${first.group}-${first.name}`.localeCompare(`${second.group}-${second.name}`))

    res.json({ categories })
})

app.post('/api/categories', authenticate, requirePhoneVerified, requireAdmin, async (req, res) => {
    const store = await readStore()
    const name = req.body.name?.trim()
    const group = req.body.group === 'Liquid' ? 'Liquid' : 'Device'
    const image = req.body.image?.trim()

    if (!name || !image) {
        sendError(res, 400, 'Category name and image are required.')
        return
    }

    try {
        assertManagedAssetUrl(image, 'Category image')
    } catch (error) {
        sendError(res, 400, error.message)
        return
    }

    const duplicateCategory = store.categories.find((category) => (
        category.name.trim().toLowerCase() === name.toLowerCase() &&
        category.group === group
    ))

    if (duplicateCategory) {
        sendError(res, 409, 'This category already exists in the selected list.')
        return
    }

    const category = {
        id: createId('cat'),
        name,
        group,
        image,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    }

    store.categories.unshift(category)
    await writeStore(store)

    res.status(201).json({
        message: 'Category created successfully.',
        category: normalizeCategory(category)
    })
})

app.put('/api/categories/:categoryId', authenticate, requirePhoneVerified, requireAdmin, async (req, res) => {
    const store = await readStore()
    const category = store.categories.find((item) => item.id === req.params.categoryId)

    if (!category) {
        sendError(res, 404, 'Category not found.')
        return
    }

    const name = req.body.name?.trim()
    const group = req.body.group === 'Liquid' ? 'Liquid' : 'Device'
    const image = req.body.image?.trim()

    if (!name || !image) {
        sendError(res, 400, 'Category name and image are required.')
        return
    }

    if (!isAllowedExistingAssetValue(image, category.image)) {
        try {
            assertManagedAssetUrl(image, 'Category image')
        } catch (error) {
            sendError(res, 400, error.message)
            return
        }
    }

    const duplicateCategory = store.categories.find((item) => (
        item.id !== category.id &&
        item.name.trim().toLowerCase() === name.toLowerCase() &&
        item.group === group
    ))

    if (duplicateCategory) {
        sendError(res, 409, 'Another category with the same name already exists in this list.')
        return
    }

    category.name = name
    category.group = group
    category.image = image
    category.updatedAt = new Date().toISOString()

    store.products.forEach((product) => {
        if (product.categoryId === category.id) {
            product.category = category.name
            product.categoryImage = category.image
            product.type = category.group === 'Liquid' ? 'Liquid' : 'Device'
            product.nicotineLevels = category.group === 'Liquid'
                ? sanitizeNicotineLevels(product.nicotineLevels, 'Liquid')
                : []
            product.updatedAt = new Date().toISOString()
        }
    })

    store.carts.forEach((cart) => {
        cart.items = cart.items.map((item) => (
            item.categoryId === category.id
                ? {
                    ...item,
                    category: category.name,
                    type: category.group === 'Liquid' ? 'Liquid' : 'Device'
                }
                : item
        ))
    })

    await writeStore(store)

    res.json({
        message: 'Category updated successfully.',
        category: normalizeCategory(category)
    })
})

app.delete('/api/categories/:categoryId', authenticate, requirePhoneVerified, requireAdmin, async (req, res) => {
    const store = await readStore()
    const category = store.categories.find((item) => item.id === req.params.categoryId)

    if (!category) {
        res.json({
            message: 'Category was already removed.'
        })
        return
    }

    const deletedProductIds = new Set(
        store.products.filter((product) => product.categoryId === category.id).map((product) => product.id)
    )

    store.categories = store.categories.filter((item) => item.id !== category.id)
    store.products = store.products.filter((product) => product.categoryId !== category.id)
    store.carts.forEach((cart) => {
        cart.items = cart.items.filter((item) => !deletedProductIds.has(item.productId))
    })

    await writeStore(store)

    res.json({
        message: 'Category and its related products were removed.'
    })
})

app.get('/api/products', async (req, res) => {
    const store = await prepareFileStore()
    let products = store.products.map(normalizeProduct)

    if (req.query.categoryId) {
        products = products.filter((product) => product.categoryId === req.query.categoryId)
    }

    if (req.query.group) {
        products = products.filter((product) => product.type === req.query.group)
    }

    if (req.query.search) {
        const searchTerm = String(req.query.search).toLowerCase().trim()
        products = products.filter((product) => product.name.toLowerCase().includes(searchTerm))
    }

    res.json({ products })
})

app.get('/api/products/:productId', async (req, res) => {
    const store = await readStore()
    const product = store.products.find((item) => item.id === req.params.productId)

    if (!product) {
        sendError(res, 404, 'Product not found.')
        return
    }

    res.json({
        product: normalizeProduct(product)
    })
})

app.post('/api/products', authenticate, requirePhoneVerified, requireAdmin, async (req, res) => {
    const store = await readStore()
    const category = ensureCategoryForProductRequest(store, req.body)
    const colors = Array.isArray(req.body.colors) && req.body.colors.length > 0
        ? req.body.colors
        : ['#5dc0ff']
    const nicotineLevels = sanitizeNicotineLevels(req.body.nicotineLevels, category?.group || 'Device')

    if (!req.body.name?.trim() || !req.body.description?.trim() || !req.body.image?.trim() || !category) {
        sendError(res, 400, 'Name, description, price, image, and category are required.')
        return
    }

    try {
        assertManagedAssetUrl(req.body.image.trim(), 'Product image')
    } catch (error) {
        sendError(res, 400, error.message)
        return
    }

    if (Number(req.body.price) <= 0) {
        sendError(res, 400, 'Name, description, price, image, and category are required.')
        return
    }

    if (category.group === 'Liquid' && nicotineLevels.length === 0) {
        sendError(res, 400, 'Please choose at least one nicotine level for the liquid product.')
        return
    }

    const product = {
        id: createId('prd'),
        name: req.body.name.trim(),
        description: req.body.description.trim(),
        price: Number(req.body.price),
        discount: Number(req.body.discount) || 0,
        image: req.body.image.trim(),
        category: category.name,
        categoryId: category.id,
        categoryImage: category.image,
        colors,
        nicotineLevels,
        color: colors[0],
        type: category.group === 'Liquid' ? 'Liquid' : 'Device',
        rating: Number(req.body.rating) || 4.5,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    }

    store.products.unshift(product)
    await writeStore(store)

    res.status(201).json({
        message: 'Product created successfully.',
        product: normalizeProduct(product)
    })
})

app.put('/api/products/:productId', authenticate, requirePhoneVerified, requireAdmin, async (req, res) => {
    const store = await readStore()
    const product = store.products.find((item) => item.id === req.params.productId)
    const category = ensureCategoryForProductRequest(store, req.body)
    const colors = Array.isArray(req.body.colors) && req.body.colors.length > 0
        ? req.body.colors
        : ['#5dc0ff']
    const nicotineLevels = sanitizeNicotineLevels(req.body.nicotineLevels, category?.group || 'Device')

    if (!product) {
        sendError(res, 404, 'Product not found.')
        return
    }

    if (!req.body.name?.trim() || !req.body.description?.trim() || !req.body.image?.trim() || !category) {
        sendError(res, 400, 'Name, description, price, image, and category are required.')
        return
    }

    if (!isAllowedExistingAssetValue(req.body.image.trim(), product.image)) {
        try {
            assertManagedAssetUrl(req.body.image.trim(), 'Product image')
        } catch (error) {
            sendError(res, 400, error.message)
            return
        }
    }

    if (Number(req.body.price) <= 0) {
        sendError(res, 400, 'Name, description, price, image, and category are required.')
        return
    }

    if (category.group === 'Liquid' && nicotineLevels.length === 0) {
        sendError(res, 400, 'Please choose at least one nicotine level for the liquid product.')
        return
    }

    Object.assign(product, {
        name: req.body.name.trim(),
        description: req.body.description.trim(),
        price: Number(req.body.price),
        discount: Number(req.body.discount) || 0,
        image: req.body.image.trim(),
        category: category.name,
        categoryId: category.id,
        categoryImage: category.image,
        colors,
        nicotineLevels,
        color: colors[0],
        type: category.group === 'Liquid' ? 'Liquid' : 'Device',
        rating: Number(req.body.rating) || 4.5,
        updatedAt: new Date().toISOString()
    })

    store.carts.forEach((cart) => {
        cart.items = cart.items.map((item) => (
            item.productId === product.id
                ? {
                    ...item,
                    name: product.name,
                    description: product.description,
                    price: product.price,
                    discount: product.discount,
                    image: product.image,
                    category: product.category,
                    categoryId: product.categoryId,
                    type: product.type
                }
                : item
        ))
    })

    await writeStore(store)

    res.json({
        message: 'Product updated successfully.',
        product: normalizeProduct(product)
    })
})

app.delete('/api/products/:productId', authenticate, requirePhoneVerified, requireAdmin, async (req, res) => {
    const store = await readStore()
    const product = store.products.find((item) => item.id === req.params.productId)

    if (!product) {
        res.json({
            message: 'Product was already removed.'
        })
        return
    }

    store.products = store.products.filter((item) => item.id !== product.id)
    store.carts.forEach((cart) => {
        cart.items = cart.items.filter((item) => item.productId !== product.id)
    })

    await writeStore(store)

    res.json({
        message: 'Product deleted successfully.'
    })
})

app.get('/api/cart', authenticate, requirePhoneVerified, async (req, res) => {
    const store = await readStore()
    const cart = getCartForUser(store, req.user.id)

    res.json({
        items: cart.items.map(normalizeCartItem),
        cartCount: cart.items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0)
    })
})

app.post('/api/cart/items', authenticate, requirePhoneVerified, async (req, res) => {
    const store = await readStore()
    const product = store.products.find((item) => item.id === req.body.productId)

    if (!product) {
        sendError(res, 404, 'The selected product could not be found.')
        return
    }

    const cart = getCartForUser(store, req.user.id)
    const selectedColor = product.colors.includes(req.body.selectedColor)
        ? req.body.selectedColor
        : product.colors[0]
    const existingItem = cart.items.find((item) => (
        item.productId === product.id &&
        item.selectedColor === selectedColor
    ))

    if (existingItem) {
        existingItem.quantity += Math.max(1, Number(req.body.quantity) || 1)
    } else {
        cart.items.push({
            id: createId('cart'),
            productId: product.id,
            categoryId: product.categoryId,
            name: product.name,
            description: product.description,
            price: product.price,
            discount: product.discount,
            image: product.image,
            quantity: Math.max(1, Number(req.body.quantity) || 1),
            selectedColor,
            category: product.category,
            type: product.type
        })
    }

    await writeStore(store)

    res.status(201).json({
        message: 'Product added to cart.',
        items: cart.items.map(normalizeCartItem),
        cartCount: cart.items.reduce((sum, item) => sum + item.quantity, 0)
    })
})

app.patch('/api/cart/items/:itemId', authenticate, requirePhoneVerified, async (req, res) => {
    const store = await readStore()
    const cart = getCartForUser(store, req.user.id)
    const item = cart.items.find((entry) => entry.id === req.params.itemId)
    const quantity = Number(req.body.quantity)

    if (!item) {
        sendError(res, 404, 'Cart item not found.')
        return
    }

    if (Number.isNaN(quantity)) {
        sendError(res, 400, 'A valid quantity is required.')
        return
    }

    if (quantity <= 0) {
        cart.items = cart.items.filter((entry) => entry.id !== item.id)
    } else {
        item.quantity = quantity
    }

    await writeStore(store)

    res.json({
        message: 'Cart updated successfully.',
        items: cart.items.map(normalizeCartItem),
        cartCount: cart.items.reduce((sum, entry) => sum + entry.quantity, 0)
    })
})

app.delete('/api/cart/items/:itemId', authenticate, requirePhoneVerified, async (req, res) => {
    const store = await readStore()
    const cart = getCartForUser(store, req.user.id)
    const existingLength = cart.items.length

    cart.items = cart.items.filter((entry) => entry.id !== req.params.itemId)

    if (existingLength === cart.items.length) {
        sendError(res, 404, 'Cart item not found.')
        return
    }

    await writeStore(store)

    res.json({
        message: 'Item removed from cart.',
        items: cart.items.map(normalizeCartItem),
        cartCount: cart.items.reduce((sum, entry) => sum + entry.quantity, 0)
    })
})

app.post('/api/orders/checkout', authenticate, requirePhoneVerified, async (req, res) => {
    const requiredFields = [
        'fullName',
        'email',
        'phone',
        'addressLine1',
        'city',
        'state',
        'postalCode',
        'country'
    ]
    const store = await readStore()
    const cart = getCartForUser(store, req.user.id)

    for (const field of requiredFields) {
        if (!req.body[field]?.trim()) {
            sendError(res, 400, `Shipping field "${field}" is required.`)
            return
        }
    }

    if (cart.items.length === 0) {
        sendError(res, 400, 'Your cart is empty. Add products before checking out.')
        return
    }

    const order = {
        id: createId('ord'),
        createdAt: new Date().toISOString(),
        status: 'pending',
        items: cart.items.map(normalizeCartItem),
        customer: {
            fullName: req.body.fullName.trim(),
            email: req.body.email.trim(),
            phone: req.body.phone.trim(),
            addressLine1: req.body.addressLine1.trim(),
            addressLine2: req.body.addressLine2?.trim() || '',
            city: req.body.city.trim(),
            state: req.body.state.trim(),
            postalCode: req.body.postalCode.trim(),
            country: req.body.country.trim(),
            notes: req.body.notes?.trim() || ''
        },
        customerSession: {
            userId: req.user.id,
            username: req.user.username,
            email: req.user.email
        },
        summary: calculateOrderSummary(cart.items),
        emailNotification: {
            status: 'pending',
            message: ''
        },
        isNew: true
    }

    try {
        order.emailNotification = await sendAdminOrderEmail(order)
    } catch (error) {
        order.emailNotification = {
            status: 'failed',
            message: error.message
        }
    }

    store.orders.unshift(order)
    cart.items = []
    await writeStore(store)

    res.status(201).json({
        message: 'Order placed successfully.',
        order: normalizeOrder(order)
    })
})

app.get('/api/orders/me', authenticate, requirePhoneVerified, async (req, res) => {
    const store = await readStore()
    const orders = store.orders
        .filter((order) => order.customerSession?.userId === req.user.id)
        .map(normalizeOrder)

    res.json({ orders })
})

app.get('/api/orders', authenticate, requirePhoneVerified, requireAdmin, async (req, res) => {
    const store = await readStore()

    res.json({
        orders: store.orders.map(normalizeOrder)
    })
})

app.patch('/api/orders/mark-seen', authenticate, requirePhoneVerified, requireAdmin, async (req, res) => {
    const store = await readStore()

    store.orders = store.orders.map((order) => ({
        ...order,
        isNew: false,
        reviewedAt: order.reviewedAt || new Date().toISOString()
    }))

    await writeStore(store)

    res.json({
        message: 'Orders marked as reviewed.',
        orders: store.orders.map(normalizeOrder)
    })
})

app.patch('/api/orders/:orderId/status', authenticate, requirePhoneVerified, requireAdmin, async (req, res) => {
    const allowedStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled']
    const status = String(req.body.status || '').trim().toLowerCase()
    const store = await readStore()
    const order = store.orders.find((item) => item.id === req.params.orderId)

    if (!allowedStatuses.includes(status)) {
        sendError(res, 400, `Status must be one of: ${allowedStatuses.join(', ')}.`)
        return
    }

    if (!order) {
        sendError(res, 404, 'Order not found.')
        return
    }

    order.status = status

    if (status !== 'pending') {
        order.isNew = false
        order.reviewedAt = order.reviewedAt || new Date().toISOString()
    }

    await writeStore(store)

    res.json({
        message: 'Order status updated successfully.',
        order: normalizeOrder(order)
    })
})

app.delete('/api/orders/:orderId', authenticate, requirePhoneVerified, requireAdmin, async (req, res) => {
    const store = await readStore()
    const existingLength = store.orders.length

    store.orders = store.orders.filter((item) => item.id !== req.params.orderId)

    if (existingLength === store.orders.length) {
        sendError(res, 404, 'Order not found.')
        return
    }

    await writeStore(store)

    res.json({
        message: 'Order removed successfully.'
    })
})

app.use((req, res) => {
    res.status(404).json({
        message: `Cannot ${req.method} ${req.originalUrl}`
    })
})

app.use((error, req, res, next) => {
    if (res.headersSent) {
        next(error)
        return
    }

    const statusCode = res.statusCode >= 400 ? res.statusCode : 500
    const safeMessage = statusCode >= 500
        ? 'Unable to process this request right now. Please try again.'
        : (error.message || 'Request failed.')

    console.error('[fallback-api-error]', {
        ...buildRequestMeta(req),
        statusCode,
        requestBody: sanitizeRequestBody(req.body),
        errorMessage: error.message || '',
        stack: error.stack || ''
    })

    res.status(statusCode).json({
        message: safeMessage,
        requestId: req.headers['x-vercel-id'] || req.headers['x-request-id'] || undefined
    })
})

export async function prepareFileApi() {
    await prepareFileStore()
}

export default app
