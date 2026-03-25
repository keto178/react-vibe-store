import bcrypt from 'bcryptjs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import env from '../config/env.js'
import { DEFAULT_CATEGORIES } from '../constants/defaultData.js'

const DATA_DIRECTORY_URL = new URL('../../data/', import.meta.url)
const DATA_FILE_URL = new URL('../../data/store.json', import.meta.url)

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

export function createId(prefix = '') {
    return prefix ? `${prefix}-${randomUUID()}` : randomUUID()
}

export async function readStore() {
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
    await mkdir(DATA_DIRECTORY_URL, { recursive: true })
    await writeFile(DATA_FILE_URL, JSON.stringify(normalizeStoreShape(store), null, 2), 'utf8')
}

function sanitizeCategory(category) {
    return {
        id: category.id,
        name: category.name,
        group: category.group || 'Device',
        image: category.image
    }
}

export function sanitizeUser(user) {
    return {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role || 'user'
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
            id: createId('usr'),
            username: adminUsername,
            email: adminEmail,
            passwordHash: await bcrypt.hash(env.adminPassword, 10),
            role: 'admin',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        })
        hasChanges = true
    } else {
        const passwordMatches = await bcrypt.compare(env.adminPassword, existingAdmin.passwordHash)

        if (
            existingAdmin.role !== 'admin' ||
            existingAdmin.email !== adminEmail ||
            existingAdmin.username !== adminUsername ||
            !passwordMatches
        ) {
            existingAdmin.role = 'admin'
            existingAdmin.email = adminEmail
            existingAdmin.username = adminUsername
            existingAdmin.passwordHash = await bcrypt.hash(env.adminPassword, 10)
            existingAdmin.updatedAt = new Date().toISOString()
            hasChanges = true
        }
    }

    for (const category of DEFAULT_CATEGORIES) {
        const existingCategory = store.categories.find((item) => (
            item.name === category.name && item.group === category.group
        ))

        if (!existingCategory) {
            store.categories.push({
                id: createId('cat'),
                ...sanitizeCategory(category),
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            })
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
