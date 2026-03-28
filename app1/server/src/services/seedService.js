import bcrypt from 'bcryptjs'
import env from '../config/env.js'
import User from '../models/User.js'

export async function seedDefaults() {
    const normalizedAdminEmail = env.adminEmail.trim().toLowerCase()
    const normalizedAdminUsername = env.adminUsername.trim().toLowerCase()
    const existingAdmin = await User.findOne({
        $or: [
            { email: normalizedAdminEmail },
            { username: normalizedAdminUsername }
        ]
    })

    if (!existingAdmin) {
        const passwordHash = await bcrypt.hash(env.adminPassword, 10)

        await User.create({
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
    } else {
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

        await existingAdmin.save()
    }
}
