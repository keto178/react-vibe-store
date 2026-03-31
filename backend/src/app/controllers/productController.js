import { asyncHandler } from '../middleware/asyncHandler.js'
import {
    createProduct as createProductService,
    deleteProduct as deleteProductService,
    getProductById as getProductByIdService,
    listProducts as listProductsService,
    updateProduct as updateProductService
} from '../services/productService.js'

const CATALOG_CACHE_CONTROL = 'no-store'

export const getProducts = asyncHandler(async (req, res) => {
    res.set('Cache-Control', CATALOG_CACHE_CONTROL)
    res.json(await listProductsService({
        categoryId: req.query.categoryId,
        group: req.query.group,
        search: req.query.search
    }))
})

export const getProductById = asyncHandler(async (req, res) => {
    res.set('Cache-Control', CATALOG_CACHE_CONTROL)
    res.json(await getProductByIdService(req.params.productId))
})

export const createProduct = asyncHandler(async (req, res) => {
    res.status(201).json(await createProductService(req.body))
})

export const updateProduct = asyncHandler(async (req, res) => {
    res.json(await updateProductService(req.params.productId, req.body))
})

export const deleteProduct = asyncHandler(async (req, res) => {
    res.json(await deleteProductService(req.params.productId))
})
