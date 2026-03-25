import express from 'express'
import {
    addCartItem,
    getCart,
    removeCartItem,
    updateCartItem
} from '../controllers/cartController.js'
import { authenticate } from '../middleware/auth.js'

const router = express.Router()

router.use(authenticate)

router.get('/', getCart)
router.post('/items', addCartItem)
router.patch('/items/:itemId', updateCartItem)
router.delete('/items/:itemId', removeCartItem)

export default router
