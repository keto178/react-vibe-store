import { AppError } from '../errors/AppError.js'
import { CartRepository } from '../repositories/CartRepository.js'
import { CategoryRepository } from '../repositories/CategoryRepository.js'
import { ProductRepository } from '../repositories/ProductRepository.js'
import { serializeProduct } from '../utils/serializers.js'
import {
    assertManagedAssetUrl,
    sanitizePersistedUploadMetadata
} from './uploadService.js'

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

function normalizeInventoryQuantity(rawValue) {
    if (rawValue === '' || rawValue === null || rawValue === undefined) {
        return null
    }

    const parsedValue = Number(rawValue)

    if (!Number.isFinite(parsedValue) || parsedValue < 0) {
        throw new AppError(400, 'PRODUCT_STOCK_INVALID', 'Stock quantity must be a non-negative number.')
    }

    return Math.floor(parsedValue)
}

export async function listProducts(filters = {}) {
    const products = await ProductRepository.list({
        categoryId: filters.categoryId
    })

    const filteredProducts = filters.group
        ? products.filter((product) => product.category?.group === filters.group)
        : products
    const searchedProducts = filters.search
        ? filteredProducts.filter((product) => (
            product.name.toLowerCase().includes(String(filters.search).toLowerCase().trim())
        ))
        : filteredProducts

    return {
        products: searchedProducts.map(serializeProduct)
    }
}

export async function getProductById(productId) {
    const product = await ProductRepository.findByIdWithCategory(productId)

    if (!product) {
        throw new AppError(404, 'PRODUCT_NOT_FOUND', 'Product not found.')
    }

    return {
        product: serializeProduct(product)
    }
}

export async function createProduct(payload) {
    const name = payload?.name?.trim()
    const description = payload?.description?.trim()
    const price = Number(payload?.price)
    const image = payload?.image?.trim()
    const categoryId = payload?.categoryId
    const discount = Number(payload?.discount) || 0
    const rating = Number(payload?.rating) || 4.5
    const colors = sanitizeColors(payload?.colors)
    const inventoryQuantity = normalizeInventoryQuantity(payload?.stockQuantity ?? payload?.inventoryQuantity)

    if (!name || !description || !image || !categoryId || Number.isNaN(price) || price <= 0) {
        throw new AppError(400, 'PRODUCT_INVALID', 'Name, description, price, image, and category are required.')
    }

    assertManagedAssetUrl(image, 'Product image')

    const category = await CategoryRepository.findById(categoryId)

    if (!category) {
        throw new AppError(404, 'CATEGORY_NOT_FOUND', 'The selected category could not be found.')
    }

    const nicotineLevels = sanitizeNicotineLevels(payload?.nicotineLevels, category.group)
    const imageMetadata = sanitizePersistedUploadMetadata(payload?.imageMetadata)

    if (category.group === 'Liquid' && nicotineLevels.length === 0) {
        throw new AppError(400, 'PRODUCT_NICOTINE_REQUIRED', 'Please choose at least one nicotine level for the liquid product.')
    }

    const product = await ProductRepository.create({
        name,
        description,
        price,
        image,
        imageMetadata,
        category: category._id,
        discount: discount < 0 ? 0 : discount,
        colors,
        nicotineLevels,
        inventoryQuantity,
        rating
    })

    await product.populate('category')

    return {
        message: 'Product created successfully.',
        product: serializeProduct(product)
    }
}

export async function updateProduct(productId, payload) {
    const product = await ProductRepository.findById(productId)

    if (!product) {
        throw new AppError(404, 'PRODUCT_NOT_FOUND', 'Product not found.')
    }

    const name = payload?.name?.trim()
    const description = payload?.description?.trim()
    const price = Number(payload?.price)
    const image = payload?.image?.trim()
    const categoryId = payload?.categoryId
    const discount = Number(payload?.discount) || 0
    const rating = Number(payload?.rating) || 4.5
    const colors = sanitizeColors(payload?.colors)
    const inventoryQuantity = normalizeInventoryQuantity(payload?.stockQuantity ?? payload?.inventoryQuantity)

    if (!name || !description || !image || !categoryId || Number.isNaN(price) || price <= 0) {
        throw new AppError(400, 'PRODUCT_INVALID', 'Name, description, price, image, and category are required.')
    }

    assertManagedAssetUrl(image, 'Product image')

    const category = await CategoryRepository.findById(categoryId)

    if (!category) {
        throw new AppError(404, 'CATEGORY_NOT_FOUND', 'The selected category could not be found.')
    }

    const nicotineLevels = sanitizeNicotineLevels(payload?.nicotineLevels, category.group)
    const imageMetadata = sanitizePersistedUploadMetadata(payload?.imageMetadata)

    if (category.group === 'Liquid' && nicotineLevels.length === 0) {
        throw new AppError(400, 'PRODUCT_NICOTINE_REQUIRED', 'Please choose at least one nicotine level for the liquid product.')
    }

    await ProductRepository.updateById(productId, {
        name,
        description,
        price,
        image,
        imageMetadata: imageMetadata || product.imageMetadata || null,
        category: category._id,
        discount: discount < 0 ? 0 : discount,
        colors,
        nicotineLevels,
        inventoryQuantity,
        rating
    })
    const updatedProduct = await ProductRepository.findByIdWithCategory(productId)

    return {
        message: 'Product updated successfully.',
        product: serializeProduct(updatedProduct)
    }
}

export async function deleteProduct(productId) {
    const product = await ProductRepository.findById(productId)

    if (!product) {
        throw new AppError(404, 'PRODUCT_NOT_FOUND', 'Product not found.')
    }

    await CartRepository.removeItemsByProductIds([product._id])
    await ProductRepository.deleteById(product._id)

    return {
        message: 'Product deleted successfully.'
    }
}
