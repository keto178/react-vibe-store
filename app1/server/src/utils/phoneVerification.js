import bcrypt from 'bcryptjs'
import { randomInt } from 'node:crypto'

export const PHONE_OTP_LENGTH = 6
export const PHONE_OTP_TTL_MS = 10 * 60 * 1000
export const PHONE_OTP_MAX_ATTEMPTS = 5

export function normalizePhoneNumber(rawValue = '') {
    const trimmedValue = String(rawValue || '').trim()

    if (!trimmedValue) {
        return ''
    }

    const hasLeadingPlus = trimmedValue.startsWith('+')
    const digitsOnlyValue = trimmedValue.replace(/\D/g, '')

    if (!digitsOnlyValue) {
        return ''
    }

    return hasLeadingPlus ? `+${digitsOnlyValue}` : digitsOnlyValue
}

export function isValidPhoneNumber(normalizedPhoneNumber) {
    if (!normalizedPhoneNumber) {
        return false
    }

    const digitsOnlyValue = normalizedPhoneNumber.startsWith('+')
        ? normalizedPhoneNumber.slice(1)
        : normalizedPhoneNumber

    return /^[1-9]\d{7,14}$/.test(digitsOnlyValue)
}

export function extractPhoneLast4(normalizedPhoneNumber) {
    const digitsOnlyValue = String(normalizedPhoneNumber || '').replace(/\D/g, '')
    return digitsOnlyValue.slice(-4)
}

export function maskPhoneNumber(last4 = '') {
    if (!last4) {
        return ''
    }

    return `*** *** ${last4}`
}

export function createPhoneVerificationCode() {
    const maxValue = 10 ** PHONE_OTP_LENGTH
    return String(randomInt(0, maxValue)).padStart(PHONE_OTP_LENGTH, '0')
}

export async function hashPhoneVerificationCode(code) {
    return bcrypt.hash(code, 10)
}

export async function comparePhoneVerificationCode(code, codeHash) {
    if (!code || !codeHash) {
        return false
    }

    return bcrypt.compare(code, codeHash)
}

export function buildPhoneVerificationRecord(codeHash) {
    return {
        codeHash,
        attempts: 0,
        requestedAt: new Date(),
        expiresAt: new Date(Date.now() + PHONE_OTP_TTL_MS)
    }
}

export function isPhoneVerificationExpired(phoneVerification) {
    if (!phoneVerification?.expiresAt) {
        return true
    }

    return new Date(phoneVerification.expiresAt).getTime() <= Date.now()
}
