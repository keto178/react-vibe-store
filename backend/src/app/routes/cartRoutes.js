import express from 'express'
import {
    addCartItem,
    getCart,
    removeCartItem,
    updateCartItem
} from '../controllers/cartController.js'
import { authenticate, requirePhoneVerified } from '../middleware/auth.js'

const router = express.Router()

router.use(authenticate, requirePhoneVerified)

router.get('/', getCart)
router.post('/items', addCartItem)
router.patch('/items/:itemId', updateCartItem)
router.delete('/items/:itemId', removeCartItem)

export default router
