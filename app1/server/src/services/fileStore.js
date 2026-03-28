import bcrypt from 'bcryptjs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import env from '../config/env.js'
import { maskPhoneNumber } from '../utils/phoneVerification.js'

const DATA_DIRECTORY_URL = new URL('../../data/', import.meta.url)
const DATA_FILE_URL = new URL('../../data/store.json', import.meta.url)
const MEMORY_STORE_KEY = '__APP1_SERVER_MEMORY_STORE__'
const isServerlessDeployment = process.env.VERCEL === '1'
const DEFAULT_ADMIN_USER_ID = 'usr-admin-default'

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

function getMemoryStore() {
    if (!globalThis[MEMORY_STORE_KEY]) {
        globalThis[MEMORY_STORE_KEY] = cloneEmptyStore()
    }

    return globalThis[MEMORY_STORE_KEY]
}

export function getFileStorageMode() {
    return isServerlessDeployment ? 'memory' : 'file'
}

export function createId(prefix = '') {
    return prefix ? `${prefix}-${randomUUID()}` : randomUUID()
}

export async function readStore() {
    if (isServerlessDeployment) {
        return cloneStore(getMemoryStore())
    }

    await mkdir(DATA_DIRECTORY_URL, { recursive: true })

    try {
        const fileContents = await readFile(DATA_FILE_URL, 'utf8')
        return normalizeStoreShape(JSON.parse(fileContents))
    } catch {
        const store = cloneEmptyStore()
        await writeStore(store)
        return store
    }
}

export async function writeStore(store) {
    if (isServerlessDeployment) {
        globalThis[MEMORY_STORE_KEY] = cloneStore(store)
        return
    }

    await mkdir(DATA_DIRECTORY_URL, { recursive: true })
    await writeFile(DATA_FILE_URL, JSON.stringify(normalizeStoreShape(store), null, 2), 'utf8')
}

export function sanitizeUser(user) {
    const isPhoneVerified = user.role === 'admin'
        ? true
        : Boolean(user.phoneVerified)

    return {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role || 'user',
        phoneMasked: maskPhoneNumber(user.phoneNumberLast4 || ''),
        isPhoneVerified,
        requiresPhoneVerification: user.role === 'admin' ? false : !isPhoneVerified
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
