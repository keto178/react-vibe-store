import bcrypt from 'bcryptjs'
import env from '../config/env.js'
import { DEFAULT_CATEGORIES } from '../constants/defaultData.js'
import Category from '../models/Category.js'
import User from '../models/User.js'

export async function seedDefaults() {
    const normalizedAdminEmail = env.adminEmail.trim().toLowerCase()
    const normalizedAdminUsername = env.adminUsername.trim().toLowerCase()
    const passwordHash = await bcrypt.hash(env.adminPassword, 10)
    const existingAdmin = await User.findOne({
        $or: [
            { email: normalizedAdminEmail },
            { username: normalizedAdminUsername }
        ]
    })

    if (!existingAdmin) {
        await User.create({
            username: normalizedAdminUsername,
            email: normalizedAdminEmail,
            passwordHash,
            role: 'admin'
        })
    } else {
        existingAdmin.username = normalizedAdminUsername
        existingAdmin.email = normalizedAdminEmail
        existingAdmin.passwordHash = passwordHash
        existingAdmin.role = 'admin'
        await existingAdmin.save()
    }

    for (const category of DEFAULT_CATEGORIES) {
        await Category.findOneAndUpdate(
            {
                name: category.name,
                group: category.group
            },
            {
                $setOnInsert: category
            },
            {
                upsert: true,
                new: true
            }
        )
    }
}
