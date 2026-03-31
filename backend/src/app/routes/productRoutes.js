import express from 'express'
import {
    createProduct,
    deleteProduct,
    getProductById,
    getProducts,
    updateProduct
} from '../controllers/productController.js'
import { authenticate, requireAdmin } from '../middleware/auth.js'

const router = express.Router()

router.get('/', getProducts)
router.get('/:productId', getProductById)
router.post('/', authenticate, requireAdmin, createProduct)
router.put('/:productId', authenticate, requireAdmin, updateProduct)
router.delete('/:productId', authenticate, requireAdmin, deleteProduct)

export default router
