import { AppError } from '../errors/AppError.js'
import { CartRepository } from '../repositories/CartRepository.js'
import { CategoryRepository } from '../repositories/CategoryRepository.js'
import { ProductRepository } from '../repositories/ProductRepository.js'
import { serializeCategory } from '../utils/serializers.js'
import {
    assertManagedAssetUrl,
    sanitizePersistedUploadMetadata
} from './uploadService.js'

export async function listCategories() {
    const categories = await CategoryRepository.list()

    return {
        categories: categories.map(serializeCategory)
    }
}

export async function createCategory(payload) {
    const name = payload?.name?.trim()
    const group = payload?.group === 'Liquid' ? 'Liquid' : 'Device'
    const image = payload?.image?.trim()

    if (!name || !image) {
        throw new AppError(400, 'CATEGORY_INVALID', 'Category name and image are required.')
    }

    assertManagedAssetUrl(image, 'Category image')

    const existingCategory = await CategoryRepository.findByNameAndGroup({ name, group })

    if (existingCategory) {
        throw new AppError(409, 'CATEGORY_EXISTS', 'This category already exists in the selected list.')
    }

    const imageMetadata = sanitizePersistedUploadMetadata(payload?.imageMetadata)
    const category = await CategoryRepository.create({
        name,
        group,
        image,
        imageMetadata
    })

    return {
        message: 'Category created successfully.',
        category: serializeCategory(category)
    }
}

export async function updateCategory(categoryId, payload) {
    const category = await CategoryRepository.findById(categoryId)

    if (!category) {
        throw new AppError(404, 'CATEGORY_NOT_FOUND', 'Category not found.')
    }

    const nextName = payload?.name?.trim()
    const nextGroup = payload?.group === 'Liquid' ? 'Liquid' : 'Device'
    const nextImage = payload?.image?.trim()

    if (!nextName || !nextImage) {
        throw new AppError(400, 'CATEGORY_INVALID', 'Category name and image are required.')
    }

    assertManagedAssetUrl(nextImage, 'Category image')

    const duplicateCategory = await CategoryRepository.findByNameAndGroup({
        name: nextName,
        group: nextGroup,
        excludeId: category._id
    })

    if (duplicateCategory) {
        throw new AppError(409, 'CATEGORY_EXISTS', 'Another category with the same name already exists in this list.')
    }

    const imageMetadata = sanitizePersistedUploadMetadata(payload?.imageMetadata)
    const updatedCategory = await CategoryRepository.updateById(categoryId, {
        name: nextName,
        group: nextGroup,
        image: nextImage,
        imageMetadata: imageMetadata || category.imageMetadata || null
    })

    if (nextGroup !== 'Liquid') {
        await ProductRepository.clearNicotineLevelsByCategoryId(category._id)
    }

    return {
        message: 'Category updated successfully.',
        category: serializeCategory(updatedCategory)
    }
}

export async function deleteCategory(categoryId) {
    const category = await CategoryRepository.findById(categoryId)

    if (!category) {
        throw new AppError(404, 'CATEGORY_NOT_FOUND', 'Category not found.')
    }

    const relatedProducts = await ProductRepository.findIdsByCategoryId(category._id)
    const relatedProductIds = relatedProducts.map((product) => product._id)

    if (relatedProductIds.length > 0) {
        await ProductRepository.deleteManyByCategoryId(category._id)
        await CartRepository.removeItemsByProductIds(relatedProductIds)
    }

    await CategoryRepository.deleteById(category._id)

    return {
        message: 'Category and its related products were removed.'
    }
}
