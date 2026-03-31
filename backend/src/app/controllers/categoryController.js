import { asyncHandler } from '../middleware/asyncHandler.js'
import {
    createCategory as createCategoryService,
    deleteCategory as deleteCategoryService,
    listCategories as listCategoriesService,
    updateCategory as updateCategoryService
} from '../services/categoryService.js'

const CATALOG_CACHE_CONTROL = 'no-store'

export const getCategories = asyncHandler(async (req, res) => {
    res.set('Cache-Control', CATALOG_CACHE_CONTROL)
    res.json(await listCategoriesService())
})

export const createCategory = asyncHandler(async (req, res) => {
    res.status(201).json(await createCategoryService(req.body))
})

export const updateCategory = asyncHandler(async (req, res) => {
    res.json(await updateCategoryService(req.params.categoryId, req.body))
})

export const deleteCategory = asyncHandler(async (req, res) => {
    res.json(await deleteCategoryService(req.params.categoryId))
})
