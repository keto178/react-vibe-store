import bcrypt from 'bcryptjs'
import env from '../../config/env.js'
import { UserRepository } from '../repositories/UserRepository.js'

export async function ensureSystemAdminUser() {
    const normalizedAdminEmail = env.adminEmail.trim().toLowerCase()
    const normalizedAdminUsername = env.adminUsername.trim().toLowerCase()
    const existingAdmin = await UserRepository.findByEmailOrUsername({
        email: normalizedAdminEmail,
        username: normalizedAdminUsername
    })

    if (!existingAdmin) {
        const passwordHash = await bcrypt.hash(env.adminPassword, 10)

        await UserRepository.create({
            username: normalizedAdminUsername,
            email: normalizedAdminEmail,
            passwordHash,
            role: 'admin',
            phoneVerified: true,
            phoneVerifiedAt: new Date(),
            phoneNumberEncrypted: '',
            phoneNumberLast4: '',
            phoneVerification: {
                codeHash: '',
                attempts: 0,
                requestedAt: null,
                expiresAt: null
            }
        })

        return
    }

    const passwordMatches = await bcrypt.compare(env.adminPassword, existingAdmin.passwordHash)
    const hasIdentityChanges = (
        existingAdmin.username !== normalizedAdminUsername ||
        existingAdmin.email !== normalizedAdminEmail ||
        existingAdmin.role !== 'admin'
    )

    if (!hasIdentityChanges && passwordMatches) {
        return
    }

    if (!passwordMatches) {
        existingAdmin.passwordHash = await bcrypt.hash(env.adminPassword, 10)
    }

    existingAdmin.username = normalizedAdminUsername
    existingAdmin.email = normalizedAdminEmail
    existingAdmin.role = 'admin'
    existingAdmin.phoneVerified = true
    existingAdmin.phoneVerifiedAt = existingAdmin.phoneVerifiedAt || new Date()
    existingAdmin.phoneNumberEncrypted = existingAdmin.phoneNumberEncrypted || ''
    existingAdmin.phoneNumberLast4 = existingAdmin.phoneNumberLast4 || ''
    existingAdmin.phoneVerification = {
        codeHash: '',
        attempts: 0,
        requestedAt: null,
        expiresAt: null
    }

    await UserRepository.save(existingAdmin)
}
