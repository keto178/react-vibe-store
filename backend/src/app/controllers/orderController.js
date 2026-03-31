import { asyncHandler } from '../middleware/asyncHandler.js'
import {
    checkout as checkoutService,
    deleteOrder as deleteOrderService,
    getAllOrders as getAllOrdersService,
    getOrdersForCurrentUser as getOrdersForCurrentUserService,
    markOrdersAsSeen as markOrdersAsSeenService,
    updateOrderStatus as updateOrderStatusService
} from '../services/orderService.js'

export const checkout = asyncHandler(async (req, res) => {
    res.status(201).json(await checkoutService(req.user, req.body))
})

export const getOrdersForCurrentUser = asyncHandler(async (req, res) => {
    res.json(await getOrdersForCurrentUserService(req.user._id))
})

export const getAllOrders = asyncHandler(async (req, res) => {
    res.json(await getAllOrdersService())
})

export const markOrdersAsSeen = asyncHandler(async (req, res) => {
    res.json(await markOrdersAsSeenService())
})

export const updateOrderStatus = asyncHandler(async (req, res) => {
    res.json(await updateOrderStatusService(req.params.orderId, req.body))
})

export const deleteOrder = asyncHandler(async (req, res) => {
    res.json(await deleteOrderService(req.params.orderId))
})
