import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto'
import env from '../config/env.js'

const CIPHER_ALGORITHM = 'aes-256-gcm'
const IV_BYTE_LENGTH = 12

function getPhoneEncryptionKey() {
    return createHash('sha256')
        .update(String(env.phoneDataSecret || env.jwtSecret || ''))
        .digest()
}

export function encryptPhoneNumber(phoneNumber) {
    const value = String(phoneNumber || '')

    if (!value) {
        return ''
    }

    const iv = randomBytes(IV_BYTE_LENGTH)
    const cipher = createCipheriv(CIPHER_ALGORITHM, getPhoneEncryptionKey(), iv)
    const encryptedValueBuffer = Buffer.concat([
        cipher.update(value, 'utf8'),
        cipher.final()
    ])
    const authTag = cipher.getAuthTag()

    return `${iv.toString('base64url')}.${authTag.toString('base64url')}.${encryptedValueBuffer.toString('base64url')}`
}

export function decryptPhoneNumber(payload) {
    const value = String(payload || '')

    if (!value) {
        return ''
    }

    const [ivPart, authTagPart, encryptedPart] = value.split('.')

    if (!ivPart || !authTagPart || !encryptedPart) {
        throw new Error('Invalid encrypted phone payload.')
    }

    const decipher = createDecipheriv(
        CIPHER_ALGORITHM,
        getPhoneEncryptionKey(),
        Buffer.from(ivPart, 'base64url')
    )

    decipher.setAuthTag(Buffer.from(authTagPart, 'base64url'))

    const decryptedValueBuffer = Buffer.concat([
        decipher.update(Buffer.from(encryptedPart, 'base64url')),
        decipher.final()
    ])

    return decryptedValueBuffer.toString('utf8')
}
