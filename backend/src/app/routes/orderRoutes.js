import express from 'express'
import {
    checkout,
    deleteOrder,
    getAllOrders,
    getOrdersForCurrentUser,
    markOrdersAsSeen,
    updateOrderStatus
} from '../controllers/orderController.js'
import {
    authenticate,
    optionalAuthenticate,
    requireAdmin,
    requirePhoneVerified,
    requireVerifiedSessionIfAuthenticated
} from '../middleware/auth.js'

const router = express.Router()

router.post('/checkout', optionalAuthenticate, requireVerifiedSessionIfAuthenticated, checkout)
router.get('/me', authenticate, requirePhoneVerified, getOrdersForCurrentUser)
router.get('/', authenticate, requirePhoneVerified, requireAdmin, getAllOrders)
router.patch('/mark-seen', authenticate, requirePhoneVerified, requireAdmin, markOrdersAsSeen)
router.patch('/:orderId/status', authenticate, requirePhoneVerified, requireAdmin, updateOrderStatus)
router.delete('/:orderId', authenticate, requirePhoneVerified, requireAdmin, deleteOrder)

export default router
