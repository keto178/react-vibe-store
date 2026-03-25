import express from 'express'
import {
    checkout,
    deleteOrder,
    getAllOrders,
    getOrdersForCurrentUser,
    markOrdersAsSeen,
    updateOrderStatus
} from '../controllers/orderController.js'
import { authenticate, requireAdmin } from '../middleware/auth.js'

const router = express.Router()

router.post('/checkout', authenticate, checkout)
router.get('/me', authenticate, getOrdersForCurrentUser)
router.get('/', authenticate, requireAdmin, getAllOrders)
router.patch('/mark-seen', authenticate, requireAdmin, markOrdersAsSeen)
router.patch('/:orderId/status', authenticate, requireAdmin, updateOrderStatus)
router.delete('/:orderId', authenticate, requireAdmin, deleteOrder)

export default router
