import bcrypt from 'bcryptjs'
import env from '../../config/env.js'
import { AppError } from '../errors/AppError.js'
import { UserRepository } from '../repositories/UserRepository.js'
import { encryptPhoneNumber } from '../../services/phoneCrypto.js'
import { sendEmailVerificationCodeEmail } from '../../services/emailService.js'
import { sendPhoneVerificationCodeSms } from '../../services/smsService.js'
import { signAuthToken } from './authTokenService.js'
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
} from '../../utils/phoneVerification.js'

const EMAIL_OTP_LENGTH = 6
const EMAIL_OTP_TTL_MS = 10 * 60 * 1000
const EMAIL_OTP_MAX_ATTEMPTS = 5

function createEmailVerificationCode() {
    const min = 10 ** (EMAIL_OTP_LENGTH - 1)
    const max = (10 ** EMAIL_OTP_LENGTH) - 1
    return String(Math.floor(Math.random() * (max - min + 1)) + min)
}

function buildEmailVerificationRecord(codeHash) {
    const requestedAt = new Date()

    return {
        codeHash,
        attempts: 0,
        requestedAt,
        expiresAt: new Date(requestedAt.getTime() + EMAIL_OTP_TTL_MS)
    }
}

function isEmailVerificationExpired(emailVerification) {
    if (!emailVerification?.expiresAt) {
        return true
    }

    return new Date(emailVerification.expiresAt).getTime() <= Date.now()
}

function buildAuthRequestMeta(requestMeta = {}) {
    return {
        ip: requestMeta.ip || '',
        userAgent: requestMeta.userAgent || '',
        requestId: requestMeta.requestId || ''
    }
}

export async function registerUser(payload) {
    const username = payload?.username?.trim().toLowerCase()
    const email = payload?.email?.trim().toLowerCase()
    const password = payload?.password || ''

    if (!username || !email || !password) {
        throw new AppError(400, 'AUTH_REGISTER_INVALID', 'Username, email, and password are required.')
    }

    if (password.length < 6) {
        throw new AppError(400, 'AUTH_PASSWORD_WEAK', 'Password must be at least 6 characters long.')
    }

    const existingUser = await UserRepository.findByEmailOrUsername({
        email,
        username
    })

    if (existingUser) {
        throw new AppError(409, 'AUTH_USER_EXISTS', 'A user with this email or username already exists.')
    }

    const passwordHash = await bcrypt.hash(password, 10)
    const user = await UserRepository.create({
        username,
        email,
        passwordHash,
        role: 'user',
        emailVerified: false,
        emailVerifiedAt: null,
        emailVerification: {
            codeHash: '',
            attempts: 0,
            requestedAt: null,
            expiresAt: null
        },
        phoneVerified: true,
        phoneNumberEncrypted: '',
        phoneNumberLast4: '',
        phoneVerification: {
            codeHash: '',
            attempts: 0,
            requestedAt: null,
            expiresAt: null
        }
    })

    return {
        message: 'Registration successful.',
        token: signAuthToken(user),
        user: serializeUser(user)
    }
}

export async function requestEmailVerificationCode(user) {
    if (user?.role === 'admin') {
        throw new AppError(400, 'EMAIL_VERIFICATION_NOT_REQUIRED', 'Admin accounts do not require email verification.')
    }

    if (user?.emailVerified) {
        throw new AppError(409, 'EMAIL_ALREADY_VERIFIED', 'Email address is already verified for this account.')
    }

    const verificationCode = createEmailVerificationCode()
    const verificationCodeHash = await hashPhoneVerificationCode(verificationCode)

    user.emailVerification = buildEmailVerificationRecord(verificationCodeHash)
    await UserRepository.save(user)

    const deliveryResult = await sendEmailVerificationCodeEmail({
        email: user.email,
        username: user.username,
        code: verificationCode
    })

    return {
        message: deliveryResult.message || 'Verification code sent by email.',
        delivery: deliveryResult.delivery,
        otpLength: EMAIL_OTP_LENGTH,
        expiresInSeconds: Math.floor(EMAIL_OTP_TTL_MS / 1000),
        verificationCode: deliveryResult.verificationCode || ''
    }
}

export async function verifyEmailCode(user, payload) {
    if (user?.role === 'admin') {
        throw new AppError(400, 'EMAIL_VERIFICATION_NOT_REQUIRED', 'Admin accounts do not require email verification.')
    }

    if (user?.emailVerified) {
        return {
            message: 'Email address already verified.',
            user: serializeUser(user)
        }
    }

    const code = String(payload?.code || '').trim()

    if (!/^\d{4,6}$/.test(code)) {
        throw new AppError(400, 'EMAIL_CODE_INVALID', 'Please enter a valid verification code.')
    }

    const verificationRecord = user?.emailVerification

    if (!verificationRecord?.codeHash || !verificationRecord?.expiresAt) {
        throw new AppError(
            400,
            'EMAIL_CODE_REQUEST_REQUIRED',
            'Request a verification code before confirming your email address.'
        )
    }

    if (isEmailVerificationExpired(verificationRecord)) {
        user.emailVerification = {
            codeHash: '',
            attempts: 0,
            requestedAt: null,
            expiresAt: null
        }
        await UserRepository.save(user)

        throw new AppError(400, 'EMAIL_CODE_EXPIRED', 'Verification code expired. Request a new code.')
    }

    if ((Number(verificationRecord.attempts) || 0) >= EMAIL_OTP_MAX_ATTEMPTS) {
        throw new AppError(429, 'EMAIL_CODE_RATE_LIMITED', 'Too many invalid attempts. Request a new verification code.')
    }

    const isCodeValid = await comparePhoneVerificationCode(code, verificationRecord.codeHash)

    if (!isCodeValid) {
        user.emailVerification.attempts = (Number(verificationRecord.attempts) || 0) + 1
        await UserRepository.save(user)

        throw new AppError(401, 'EMAIL_CODE_INVALID', 'Invalid verification code.')
    }

    user.emailVerified = true
    user.emailVerifiedAt = new Date()
    user.emailVerification = {
        codeHash: '',
        attempts: 0,
        requestedAt: null,
        expiresAt: null
    }
    await UserRepository.save(user)

    return {
        message: 'Email address verified successfully.',
        user: serializeUser(user)
    }
}

export async function loginUser(payload, requestMeta = {}) {
    const email = payload?.email?.trim().toLowerCase()
    const password = payload?.password || ''
    const normalizedRequestMeta = buildAuthRequestMeta(requestMeta)

    console.info('[auth/login] Received login request.', {
        ...normalizedRequestMeta,
        email: email || '',
        hasPassword: Boolean(password),
        passwordLength: typeof password === 'string' ? password.length : 0
    })

    if (!email || !password) {
        throw new AppError(400, 'AUTH_LOGIN_INVALID', 'Email and password are required.')
    }

    let user
    let passwordMatches = false

    try {
        user = await UserRepository.findByEmail(email)

        if (user) {
            passwordMatches = await user.comparePassword(password)
        }
    } catch (error) {
        console.error('[auth/login] Login query failed.', {
            ...normalizedRequestMeta,
            email,
            errorMessage: error.message,
            stack: error.stack || ''
        })

        throw new AppError(500, 'AUTH_LOGIN_FAILED', 'Unable to process login right now. Please try again.', {
            expose: true,
            cause: error
        })
    }

    if (!user || !passwordMatches) {
        throw new AppError(401, 'AUTH_LOGIN_FAILED', 'Incorrect email or password.')
    }

    return {
        message: 'Login successful.',
        token: signAuthToken(user),
        user: serializeUser(user)
    }
}

export function getCurrentUser(user) {
    return {
        user: serializeUser(user)
    }
}

export async function requestPhoneVerificationCode(user, payload) {
    if (user?.role === 'admin') {
        throw new AppError(400, 'PHONE_VERIFICATION_NOT_REQUIRED', 'Admin accounts do not require phone verification.')
    }

    if (user?.phoneVerified) {
        throw new AppError(409, 'PHONE_ALREADY_VERIFIED', 'Phone number is already verified for this account.')
    }

    const normalizedPhoneNumber = normalizePhoneNumber(
        payload?.phoneNumber || payload?.phone || '',
        { defaultCountryCode: env.phoneDefaultCountryCode }
    )

    if (!normalizedPhoneNumber || !isValidPhoneNumber(normalizedPhoneNumber)) {
        throw new AppError(400, 'PHONE_INVALID', 'Please enter a valid phone number in international format.')
    }

    const verificationCode = createPhoneVerificationCode()
    const verificationCodeHash = await hashPhoneVerificationCode(verificationCode)

    user.phoneNumberEncrypted = encryptPhoneNumber(normalizedPhoneNumber)
    user.phoneNumberLast4 = extractPhoneLast4(normalizedPhoneNumber)
    user.phoneVerified = false
    user.phoneVerifiedAt = null
    user.phoneVerification = buildPhoneVerificationRecord(verificationCodeHash)
    await UserRepository.save(user)

    const deliveryResult = await sendPhoneVerificationCodeSms({
        phoneNumber: normalizedPhoneNumber,
        code: verificationCode
    })

    return {
        message: deliveryResult.message || (
            deliveryResult.delivery === 'sms'
                ? 'Verification code sent by SMS.'
                : 'SMS is not configured. Verification code is available in preview mode.'
        ),
        delivery: deliveryResult.delivery,
        otpLength: PHONE_OTP_LENGTH,
        expiresInSeconds: Math.floor(PHONE_OTP_TTL_MS / 1000),
        verificationCode: deliveryResult.verificationCode || ''
    }
}

export async function verifyPhoneCode(user, payload) {
    if (user?.role === 'admin') {
        throw new AppError(400, 'PHONE_VERIFICATION_NOT_REQUIRED', 'Admin accounts do not require phone verification.')
    }

    if (user?.phoneVerified) {
        return {
            message: 'Phone number already verified.',
            user: serializeUser(user)
        }
    }

    const code = String(payload?.code || '').trim()

    if (!/^\d{4,6}$/.test(code)) {
        throw new AppError(400, 'PHONE_CODE_INVALID', 'Please enter a valid verification code.')
    }

    const verificationRecord = user?.phoneVerification

    if (!verificationRecord?.codeHash || !verificationRecord?.expiresAt) {
        throw new AppError(
            400,
            'PHONE_CODE_REQUEST_REQUIRED',
            'Request a verification code before confirming your phone number.'
        )
    }

    if (isPhoneVerificationExpired(verificationRecord)) {
        user.phoneVerification = {
            codeHash: '',
            attempts: 0,
            requestedAt: null,
            expiresAt: null
        }
        await UserRepository.save(user)

        throw new AppError(400, 'PHONE_CODE_EXPIRED', 'Verification code expired. Request a new code.')
    }

    if ((Number(verificationRecord.attempts) || 0) >= PHONE_OTP_MAX_ATTEMPTS) {
        throw new AppError(429, 'PHONE_CODE_RATE_LIMITED', 'Too many invalid attempts. Request a new verification code.')
    }

    const isCodeValid = await comparePhoneVerificationCode(code, verificationRecord.codeHash)

    if (!isCodeValid) {
        user.phoneVerification.attempts = (Number(verificationRecord.attempts) || 0) + 1
        await UserRepository.save(user)

        throw new AppError(401, 'PHONE_CODE_INVALID', 'Invalid verification code.')
    }

    if (!user.phoneNumberEncrypted || !user.phoneNumberLast4) {
        throw new AppError(400, 'PHONE_DATA_MISSING', 'Phone number data is missing. Request a new verification code.')
    }

    user.phoneVerified = true
    user.phoneVerifiedAt = new Date()
    user.phoneVerification = {
        codeHash: '',
        attempts: 0,
        requestedAt: null,
        expiresAt: null
    }
    await UserRepository.save(user)

    return {
        message: 'Phone number verified successfully.',
        user: serializeUser(user)
    }
}
