import bcrypt from 'bcryptjs'
import User from '../models/User.js'
import env from '../config/env.js'
import { asyncHandler } from '../middleware/asyncHandler.js'
import { getDatabaseDebugState } from '../config/db.js'
import { encryptPhoneNumber } from '../services/phoneCrypto.js'
import { sendPhoneVerificationCodeSms } from '../services/smsService.js'
import { signAuthToken } from '../services/tokenService.js'
import { serializeUser } from '../utils/serializers.js'
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
} from '../utils/phoneVerification.js'

function buildAuthRequestMeta(req) {
    return {
        ip: req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '',
        userAgent: req.headers['user-agent'] || '',
        requestId: req.headers['x-vercel-id'] || req.headers['x-request-id'] || ''
    }
}

export const registerUser = asyncHandler(async (req, res) => {
    const username = req.body?.username?.trim()
    const email = req.body?.email?.trim().toLowerCase()
    const password = req.body?.password || ''

    if (!username || !email || !password) {
        res.status(400)
        throw new Error('Username, email, and password are required.')
    }

    if (password.length < 6) {
        res.status(400)
        throw new Error('Password must be at least 6 characters long.')
    }

    const existingUser = await User.findOne({
        $or: [
            { email },
            { username: username.toLowerCase() }
        ]
    })

    if (existingUser) {
        res.status(409)
        throw new Error('A user with this email or username already exists.')
    }

    const passwordHash = await bcrypt.hash(password, 10)
    const user = await User.create({
        username: username.toLowerCase(),
        email,
        passwordHash,
        role: 'user',
        phoneVerified: false,
        phoneNumberEncrypted: '',
        phoneNumberLast4: '',
        phoneVerification: {
            codeHash: '',
            attempts: 0,
            requestedAt: null,
            expiresAt: null
        }
    })

    res.status(201).json({
        message: 'Registration successful.',
        token: signAuthToken(user),
        user: serializeUser(user)
    })
})

export const loginUser = asyncHandler(async (req, res) => {
    const email = req.body?.email?.trim().toLowerCase()
    const password = req.body?.password || ''
    const requestMeta = buildAuthRequestMeta(req)

    console.info('[auth/login] Received login request.', {
        ...requestMeta,
        email: email || '',
        hasPassword: Boolean(password),
        passwordLength: typeof password === 'string' ? password.length : 0
    })

    if (!email || !password) {
        res.status(400)
        throw new Error('Email and password are required.')
    }

    let user
    let passwordMatches = false

    try {
        user = await User.findOne({ email })

        if (user) {
            passwordMatches = await user.comparePassword(password)
        }
    } catch (error) {
        console.error('[auth/login] Login query failed.', {
            ...requestMeta,
            email,
            database: getDatabaseDebugState(),
            errorMessage: error.message,
            stack: error.stack || ''
        })

        res.status(500)
        throw new Error('Unable to process login right now. Please try again.')
    }

    if (!user || !passwordMatches) {
        res.status(401)
        throw new Error('Incorrect email or password.')
    }

    res.json({
        message: 'Login successful.',
        token: signAuthToken(user),
        user: serializeUser(user)
    })
})

export const requestPhoneVerificationCode = asyncHandler(async (req, res) => {
    if (req.user?.role === 'admin') {
        res.status(400)
        throw new Error('Admin accounts do not require phone verification.')
    }

    if (req.user?.phoneVerified) {
        res.status(409)
        throw new Error('Phone number is already verified for this account.')
    }

    const normalizedPhoneNumber = normalizePhoneNumber(
        req.body?.phoneNumber || req.body?.phone || '',
        { defaultCountryCode: env.phoneDefaultCountryCode }
    )

    if (!normalizedPhoneNumber || !isValidPhoneNumber(normalizedPhoneNumber)) {
        res.status(400)
        throw new Error('Please enter a valid phone number in international format.')
    }

    const verificationCode = createPhoneVerificationCode()
    const verificationCodeHash = await hashPhoneVerificationCode(verificationCode)

    req.user.phoneNumberEncrypted = encryptPhoneNumber(normalizedPhoneNumber)
    req.user.phoneNumberLast4 = extractPhoneLast4(normalizedPhoneNumber)
    req.user.phoneVerified = false
    req.user.phoneVerifiedAt = null
    req.user.phoneVerification = buildPhoneVerificationRecord(verificationCodeHash)
    await req.user.save()

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
})

export const verifyPhoneCode = asyncHandler(async (req, res) => {
    if (req.user?.role === 'admin') {
        res.status(400)
        throw new Error('Admin accounts do not require phone verification.')
    }

    if (req.user?.phoneVerified) {
        res.json({
            message: 'Phone number already verified.',
            user: serializeUser(req.user)
        })
        return
    }

    const code = String(req.body?.code || '').trim()

    if (!/^\d{4,6}$/.test(code)) {
        res.status(400)
        throw new Error('Please enter a valid verification code.')
    }

    const verificationRecord = req.user?.phoneVerification

    if (!verificationRecord?.codeHash || !verificationRecord?.expiresAt) {
        res.status(400)
        throw new Error('Request a verification code before confirming your phone number.')
    }

    if (isPhoneVerificationExpired(verificationRecord)) {
        req.user.phoneVerification = {
            codeHash: '',
            attempts: 0,
            requestedAt: null,
            expiresAt: null
        }
        await req.user.save()

        res.status(400)
        throw new Error('Verification code expired. Request a new code.')
    }

    if ((Number(verificationRecord.attempts) || 0) >= PHONE_OTP_MAX_ATTEMPTS) {
        res.status(429)
        throw new Error('Too many invalid attempts. Request a new verification code.')
    }

    const isCodeValid = await comparePhoneVerificationCode(code, verificationRecord.codeHash)

    if (!isCodeValid) {
        req.user.phoneVerification.attempts = (Number(verificationRecord.attempts) || 0) + 1
        await req.user.save()

        res.status(401)
        throw new Error('Invalid verification code.')
    }

    if (!req.user.phoneNumberEncrypted || !req.user.phoneNumberLast4) {
        res.status(400)
        throw new Error('Phone number data is missing. Request a new verification code.')
    }

    req.user.phoneVerified = true
    req.user.phoneVerifiedAt = new Date()
    req.user.phoneVerification = {
        codeHash: '',
        attempts: 0,
        requestedAt: null,
        expiresAt: null
    }
    await req.user.save()

    res.json({
        message: 'Phone number verified successfully.',
        user: serializeUser(req.user)
    })
})

export const getCurrentUser = asyncHandler(async (req, res) => {
    res.json({
        user: serializeUser(req.user)
    })
})
