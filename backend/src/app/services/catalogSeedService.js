import { readFile } from 'node:fs/promises'
import { CategoryRepository } from '../repositories/CategoryRepository.js'
import { ProductRepository } from '../repositories/ProductRepository.js'

const DEFAULT_SEED_FILE_URL = new URL('../../../data/default-store.json', import.meta.url)
const ALLOWED_NICOTINE_LEVELS = [9, 12, 30, 50]

function sanitizeColors(colors) {
    if (!Array.isArray(colors) || colors.length === 0) {
        return ['#5dc0ff']
    }

    const normalizedColors = colors.map((color) => String(color).trim()).filter(Boolean)
    return normalizedColors.length > 0 ? normalizedColors : ['#5dc0ff']
}

function sanitizeNicotineLevels(levels, categoryGroup) {
    if (categoryGroup !== 'Liquid' || !Array.isArray(levels)) {
        return []
    }

    return Array.from(
        new Set(
            levels
                .map((level) => Number(level))
                .filter((level) => ALLOWED_NICOTINE_LEVELS.includes(level))
        )
    )
        .sort((firstLevel, secondLevel) => firstLevel - secondLevel)
        .slice(0, 2)
}

function normalizeSeedData(payload) {
    return {
        categories: Array.isArray(payload?.categories) ? payload.categories : [],
        products: Array.isArray(payload?.products) ? payload.products : []
    }
}

function normalizeNaturalKeyPart(value) {
    return String(value || '').trim().toLowerCase()
}

function buildCategoryNaturalKey({ name, group }) {
    return `${normalizeNaturalKeyPart(group)}::${normalizeNaturalKeyPart(name)}`
}

function buildProductNaturalKey({ name, categoryId }) {
    return `${String(categoryId || '').trim()}::${normalizeNaturalKeyPart(name)}`
}

function toId(value) {
    if (!value) {
        return ''
    }

    if (typeof value === 'string') {
        return value
    }

    if (typeof value.toString === 'function') {
        return value.toString()
    }

    return ''
}

async function loadSeedData() {
    try {
        const fileContents = await readFile(DEFAULT_SEED_FILE_URL, 'utf8')
        return normalizeSeedData(JSON.parse(fileContents))
    } catch {
        return {
            categories: [],
            products: []
        }
    }
}

export async function ensureCatalogSeedData() {
    const seedData = await loadSeedData()

    if (seedData.categories.length === 0 && seedData.products.length === 0) {
        return {
            status: 'skipped-no-seed-data',
            categoriesSeeded: 0,
            productsSeeded: 0
        }
    }

    const [existingCategories, existingProducts] = await Promise.all([
        CategoryRepository.list(),
        ProductRepository.list()
    ])

    const categoryMap = new Map()
    const categoryNaturalKeyMap = new Map()
    const productNaturalKeySet = new Set()
    let categoriesSeeded = 0
    let productsSeeded = 0

    for (const category of existingCategories) {
        categoryNaturalKeyMap.set(buildCategoryNaturalKey(category), category)
    }

    for (const product of existingProducts) {
        productNaturalKeySet.add(buildProductNaturalKey({
            name: product?.name,
            categoryId: toId(product?.category?._id || product?.category)
        }))
    }

    for (const rawCategory of seedData.categories) {
        const name = String(rawCategory?.name || '').trim()
        const group = rawCategory?.group === 'Liquid' ? 'Liquid' : 'Device'
        const image = String(rawCategory?.image || '').trim()
        const categoryNaturalKey = buildCategoryNaturalKey({ name, group })

        if (!name || !image) {
            continue
        }

        let category = categoryNaturalKeyMap.get(categoryNaturalKey)

        if (!category) {
            category = await CategoryRepository.create({
                name,
                group,
                image,
                imageMetadata: null
            })
            categoryNaturalKeyMap.set(categoryNaturalKey, category)
            categoriesSeeded += 1
        }

        categoryMap.set(String(rawCategory?.id || '').trim(), category._id)
    }

    for (const rawProduct of seedData.products) {
        const name = String(rawProduct?.name || '').trim()
        const description = String(rawProduct?.description || '').trim()
        const image = String(rawProduct?.image || '').trim()
        const price = Number(rawProduct?.price)
        const categoryId = categoryMap.get(String(rawProduct?.categoryId || '').trim())
        const categoryGroup = String(rawProduct?.type || '').trim() === 'Liquid' ? 'Liquid' : 'Device'
        const productNaturalKey = buildProductNaturalKey({
            name,
            categoryId: toId(categoryId)
        })

        if (!name || !description || !image || !categoryId || Number.isNaN(price) || price <= 0) {
            continue
        }

        if (productNaturalKeySet.has(productNaturalKey)) {
            continue
        }

        await ProductRepository.create({
            name,
            description,
            price,
            image,
            imageMetadata: null,
            category: categoryId,
            discount: Math.max(0, Number(rawProduct?.discount) || 0),
            colors: sanitizeColors(rawProduct?.colors),
            nicotineLevels: sanitizeNicotineLevels(rawProduct?.nicotineLevels, categoryGroup),
            inventoryQuantity: null,
            rating: Number(rawProduct?.rating) || 4.5
        })

        productNaturalKeySet.add(productNaturalKey)
        productsSeeded += 1
    }

    if (categoriesSeeded === 0 && productsSeeded === 0) {
        return {
            status: 'skipped-existing-data',
            categoriesSeeded: 0,
            productsSeeded: 0
        }
    }

    return {
        status: 'applied',
        categoriesSeeded,
        productsSeeded
    }
}
