import bcrypt from 'bcryptjs'
import { randomInt } from 'node:crypto'

export const PHONE_OTP_LENGTH = 6
export const PHONE_OTP_TTL_MS = 10 * 60 * 1000
export const PHONE_OTP_MAX_ATTEMPTS = 5

function normalizeCountryCode(value = '+20') {
    const normalized = String(value || '').trim().replace(/\D/g, '')
    return normalized ? `+${normalized}` : '+20'
}

export function normalizePhoneNumber(rawValue = '', options = {}) {
    const trimmedValue = String(rawValue || '').trim()
    const defaultCountryCode = normalizeCountryCode(options.defaultCountryCode)

    if (!trimmedValue) {
        return ''
    }

    const hasLeadingPlus = trimmedValue.startsWith('+')
    const digitsOnlyValue = trimmedValue.replace(/\D/g, '')

    if (!digitsOnlyValue) {
        return ''
    }

    if (hasLeadingPlus) {
        return `+${digitsOnlyValue}`
    }

    if (digitsOnlyValue.startsWith('00')) {
        return `+${digitsOnlyValue.slice(2)}`
    }

    if (digitsOnlyValue.startsWith('0')) {
        return `${defaultCountryCode}${digitsOnlyValue.slice(1)}`
    }

    return `+${digitsOnlyValue}`
}

export function isValidPhoneNumber(normalizedPhoneNumber) {
    if (!normalizedPhoneNumber) {
        return false
    }

    return /^\+[1-9]\d{7,14}$/.test(normalizedPhoneNumber)
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
