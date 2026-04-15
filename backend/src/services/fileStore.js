import bcrypt from 'bcryptjs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import { get, put } from '@vercel/blob'
import env from '../config/env.js'
import { maskPhoneNumber } from '../utils/phoneVerification.js'

const DATA_DIRECTORY_URL = new URL('../../data/', import.meta.url)
const LEGACY_DATA_FILE_URL = new URL('../../data/store.json', import.meta.url)
const RUNTIME_DATA_FILE_URL = new URL('../../data/runtime-store.json', import.meta.url)
const SEED_DATA_FILE_URL = new URL('../../data/default-store.json', import.meta.url)
const RUNTIME_STORE_BLOB_PATHNAME = 'app1/runtime-store.json'
const BLOB_JSON_CACHE_SECONDS = 60
const MEMORY_STORE_KEY = '__REACT_WORK_MEMORY_STORE__'
const DEFAULT_ADMIN_USER_ID = 'usr-admin-default'
const isServerlessDeployment = process.env.VERCEL === '1'

const EMPTY_STORE = {
    users: [],
    categories: [],
    products: [],
    carts: [],
    orders: []
}

function cloneEmptyStore() {
    return JSON.parse(JSON.stringify(EMPTY_STORE))
}

function normalizeStoreShape(store) {
    return {
        users: Array.isArray(store?.users) ? store.users : [],
        categories: Array.isArray(store?.categories) ? store.categories : [],
        products: Array.isArray(store?.products) ? store.products : [],
        carts: Array.isArray(store?.carts) ? store.carts : [],
        orders: Array.isArray(store?.orders) ? store.orders : []
    }
}

function cloneStore(store) {
    return JSON.parse(JSON.stringify(normalizeStoreShape(store)))
}

function hasBlobReadWriteToken() {
    return Boolean(process.env.BLOB_READ_WRITE_TOKEN)
}

function isBlobRuntimeStoreEnabled() {
    return hasBlobReadWriteToken() && (
        isServerlessDeployment ||
        process.env.REACT_WORK_USE_BLOB_FALLBACK === '1'
    )
}

async function readBlobText(pathname, options) {
    const blobResult = await get(pathname, options)

    if (!blobResult?.stream) {
        return null
    }

    return new Response(blobResult.stream).text()
}

async function readRuntimeStoreBlob() {
    const rawContents = await readBlobText(RUNTIME_STORE_BLOB_PATHNAME, {
        access: 'private',
        useCache: false
    })

    if (!rawContents) {
        return null
    }

    return JSON.parse(rawContents)
}

async function writeRuntimeStoreBlob(store) {
    const payload = JSON.stringify(store, null, 2)

    return put(RUNTIME_STORE_BLOB_PATHNAME, payload, {
        access: 'private',
        addRandomSuffix: false,
        allowOverwrite: true,
        cacheControlMaxAge: BLOB_JSON_CACHE_SECONDS,
        contentType: 'application/json'
    })
}

async function readStoreFile(fileUrl) {
    try {
        const fileContents = await readFile(fileUrl, 'utf8')
        return normalizeStoreShape(JSON.parse(fileContents))
    } catch {
        return null
    }
}

async function loadSeedStore() {
    return readStoreFile(SEED_DATA_FILE_URL)
}

async function loadBundledStore() {
    return (
        await loadSeedStore() ||
        cloneEmptyStore()
    )
}

async function loadInitialLocalStore() {
    return (
        await readStoreFile(RUNTIME_DATA_FILE_URL) ||
        await readStoreFile(LEGACY_DATA_FILE_URL) ||
        await loadSeedStore() ||
        cloneEmptyStore()
    )
}

async function getMemoryStore() {
    if (!globalThis[MEMORY_STORE_KEY]) {
        globalThis[MEMORY_STORE_KEY] = await loadBundledStore()
    }

    return globalThis[MEMORY_STORE_KEY]
}

export function getFileStorageMode() {
    if (isBlobRuntimeStoreEnabled()) {
        return 'blob'
    }

    return isServerlessDeployment ? 'memory' : 'file'
}

export function getFileCatalogSource() {
    if (isBlobRuntimeStoreEnabled()) {
        return 'vercel-blob'
    }

    return isServerlessDeployment ? 'bundled-seed' : 'local-runtime'
}

export function createId(prefix = '') {
    return prefix ? `${prefix}-${randomUUID()}` : randomUUID()
}

export async function readStore() {
    if (isBlobRuntimeStoreEnabled()) {
        const blobStore = await readRuntimeStoreBlob()

        if (blobStore) {
            return normalizeStoreShape(blobStore)
        }

        const initialStore = await loadBundledStore()
        await writeStore(initialStore)
        return initialStore
    }

    if (isServerlessDeployment) {
        return cloneStore(await getMemoryStore())
    }

    await mkdir(DATA_DIRECTORY_URL, { recursive: true })

    const runtimeStore = await readStoreFile(RUNTIME_DATA_FILE_URL)

    if (runtimeStore) {
        return runtimeStore
    }

    const initialStore = await loadInitialLocalStore()
    await writeStore(initialStore)
    return initialStore
}

export async function writeStore(store) {
    if (isBlobRuntimeStoreEnabled()) {
        await writeRuntimeStoreBlob(normalizeStoreShape(store))
        return
    }

    if (isServerlessDeployment) {
        globalThis[MEMORY_STORE_KEY] = cloneStore(store)
        return
    }

    await mkdir(DATA_DIRECTORY_URL, { recursive: true })
    await writeFile(
        RUNTIME_DATA_FILE_URL,
        JSON.stringify(normalizeStoreShape(store), null, 2),
        'utf8'
    )
}

export function sanitizeUser(user) {
    const isPhoneVerified = user?.role === 'admin'
        ? true
        : Boolean(user?.phoneVerified)

    return {
        id: user?.id || '',
        username: user?.username || '',
        email: user?.email || '',
        role: user?.role || 'user',
        phoneMasked: maskPhoneNumber(user?.phoneNumberLast4 || ''),
        isPhoneVerified,
        requiresPhoneVerification: user?.role === 'admin' ? false : !isPhoneVerified
    }
}

export async function prepareFileStore() {
    const store = await readStore()
    let hasChanges = false
    const adminEmail = env.adminEmail.trim().toLowerCase()
    const adminUsername = env.adminUsername.trim().toLowerCase()
    const existingAdmin = store.users.find((user) => (
        user.email === adminEmail || user.username === adminUsername
    ))

    if (!existingAdmin) {
        store.users.push({
            id: DEFAULT_ADMIN_USER_ID,
            username: adminUsername,
            email: adminEmail,
            passwordHash: await bcrypt.hash(env.adminPassword, 10),
            role: 'admin',
            phoneNumberEncrypted: '',
            phoneNumberLast4: '',
            phoneVerified: true,
            phoneVerifiedAt: new Date().toISOString(),
            phoneVerification: {
                codeHash: '',
                attempts: 0,
                requestedAt: null,
                expiresAt: null
            },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        })
        hasChanges = true
    } else {
        const passwordMatches = await bcrypt.compare(env.adminPassword, existingAdmin.passwordHash)

        if (
            existingAdmin.id !== DEFAULT_ADMIN_USER_ID ||
            existingAdmin.role !== 'admin' ||
            existingAdmin.email !== adminEmail ||
            existingAdmin.username !== adminUsername ||
            !passwordMatches
        ) {
            existingAdmin.id = DEFAULT_ADMIN_USER_ID
            existingAdmin.role = 'admin'
            existingAdmin.email = adminEmail
            existingAdmin.username = adminUsername
            existingAdmin.passwordHash = await bcrypt.hash(env.adminPassword, 10)
            existingAdmin.phoneNumberEncrypted = existingAdmin.phoneNumberEncrypted || ''
            existingAdmin.phoneNumberLast4 = existingAdmin.phoneNumberLast4 || ''
            existingAdmin.phoneVerified = true
            existingAdmin.phoneVerifiedAt = existingAdmin.phoneVerifiedAt || new Date().toISOString()
            existingAdmin.phoneVerification = {
                codeHash: '',
                attempts: 0,
                requestedAt: null,
                expiresAt: null
            }
            existingAdmin.updatedAt = new Date().toISOString()
            hasChanges = true
        }
    }

    for (const user of store.users) {
        let userChanged = false

        if (typeof user.phoneNumberEncrypted !== 'string') {
            user.phoneNumberEncrypted = ''
            userChanged = true
        }

        if (typeof user.phoneNumberLast4 !== 'string') {
            user.phoneNumberLast4 = ''
            userChanged = true
        }

        if (typeof user.phoneVerified !== 'boolean') {
            user.phoneVerified = user.role === 'admin'
            userChanged = true
        }

        if (!Object.hasOwn(user, 'phoneVerifiedAt')) {
            user.phoneVerifiedAt = user.phoneVerified ? new Date().toISOString() : null
            userChanged = true
        }

        if (!user.phoneVerification || typeof user.phoneVerification !== 'object') {
            user.phoneVerification = {
                codeHash: '',
                attempts: 0,
                requestedAt: null,
                expiresAt: null
            }
            userChanged = true
        } else {
            if (typeof user.phoneVerification.codeHash !== 'string') {
                user.phoneVerification.codeHash = ''
                userChanged = true
            }

            if (typeof user.phoneVerification.attempts !== 'number') {
                user.phoneVerification.attempts = 0
                userChanged = true
            }

            if (!Object.hasOwn(user.phoneVerification, 'requestedAt')) {
                user.phoneVerification.requestedAt = null
                userChanged = true
            }

            if (!Object.hasOwn(user.phoneVerification, 'expiresAt')) {
                user.phoneVerification.expiresAt = null
                userChanged = true
            }
        }

        if (user.role === 'admin' && !user.phoneVerified) {
            user.phoneVerified = true
            user.phoneVerifiedAt = user.phoneVerifiedAt || new Date().toISOString()
            user.phoneVerification = {
                codeHash: '',
                attempts: 0,
                requestedAt: null,
                expiresAt: null
            }
            userChanged = true
        }

        if (userChanged) {
            user.updatedAt = new Date().toISOString()
            hasChanges = true
        }
    }

    for (const category of store.categories) {
        if (!category.id) {
            category.id = createId('cat')
            category.updatedAt = new Date().toISOString()
            hasChanges = true
        }
    }

    if (hasChanges) {
        await writeStore(store)
    }

    return store
}

export function getCartForUser(store, userId) {
    let cart = store.carts.find((item) => item.userId === userId)

    if (!cart) {
        cart = {
            userId,
            items: []
        }
        store.carts.push(cart)
    }

    if (!Array.isArray(cart.items)) {
        cart.items = []
    }

    return cart
}
