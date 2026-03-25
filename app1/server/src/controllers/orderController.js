import Cart from '../models/Cart.js'
import Order from '../models/Order.js'
import { asyncHandler } from '../middleware/asyncHandler.js'
import { sendAdminOrderEmail } from '../services/emailService.js'
import { calculateOrderSummary } from '../utils/order.js'
import { serializeOrder } from '../utils/serializers.js'

async function populateCartForCheckout(userId) {
    return Cart.findOne({ user: userId }).populate({
        path: 'items.product',
        populate: {
            path: 'category'
        }
    })
}

async function loadOrders(query = {}) {
    const orders = await Order.find(query).sort({ createdAt: -1 })
    return orders.map(serializeOrder)
}

export const checkout = asyncHandler(async (req, res) => {
    const requiredFields = [
        'fullName',
        'email',
        'phone',
        'addressLine1',
        'city',
        'state',
        'postalCode',
        'country'
    ]

    for (const field of requiredFields) {
        if (!req.body[field]?.trim()) {
            res.status(400)
            throw new Error(`Shipping field "${field}" is required.`)
        }
    }

    const cart = await populateCartForCheckout(req.user._id)

    if (!cart || cart.items.length === 0) {
        res.status(400)
        throw new Error('Your cart is empty. Add products before checking out.')
    }

    const orderItems = cart.items
        .filter((item) => item.product && item.product.category)
        .map((item) => ({
            product: item.product._id,
            name: item.product.name,
            description: item.product.description,
            price: item.product.price,
            discount: item.product.discount || 0,
            image: item.product.image,
            quantity: item.quantity,
            selectedColor: item.selectedColor,
            category: item.product.category.name,
            categoryId: item.product.category._id.toString(),
            type: item.product.category.group === 'Liquid' ? 'Liquid' : 'Device'
        }))

    if (orderItems.length === 0) {
        res.status(400)
        throw new Error('No valid cart items were available for checkout.')
    }

    const customer = {
        fullName: req.body.fullName.trim(),
        email: req.body.email.trim(),
        phone: req.body.phone.trim(),
        addressLine1: req.body.addressLine1.trim(),
        addressLine2: req.body.addressLine2?.trim() || '',
        city: req.body.city.trim(),
        state: req.body.state.trim(),
        postalCode: req.body.postalCode.trim(),
        country: req.body.country.trim(),
        notes: req.body.notes?.trim() || ''
    }

    const order = await Order.create({
        user: req.user._id,
        items: orderItems,
        customer,
        customerSession: {
            userId: req.user._id,
            username: req.user.username,
            email: req.user.email
        },
        summary: calculateOrderSummary(orderItems),
        status: 'pending',
        emailNotification: {
            status: 'pending',
            message: ''
        },
        isUnread: true
    })

    let emailNotification

    try {
        emailNotification = await sendAdminOrderEmail(serializeOrder(order))
    } catch (error) {
        emailNotification = {
            status: 'failed',
            message: error.message
        }
    }

    order.emailNotification = emailNotification
    await order.save()

    cart.items = []
    await cart.save()

    res.status(201).json({
        message: 'Order placed successfully.',
        order: serializeOrder(order)
    })
})

export const getOrdersForCurrentUser = asyncHandler(async (req, res) => {
    res.json({
        orders: await loadOrders({ user: req.user._id })
    })
})

export const getAllOrders = asyncHandler(async (req, res) => {
    res.json({
        orders: await loadOrders()
    })
})

export const markOrdersAsSeen = asyncHandler(async (req, res) => {
    await Order.updateMany(
        {
            isUnread: true
        },
        {
            $set: {
                isUnread: false,
                reviewedAt: new Date()
            }
        }
    )

    res.json({
        message: 'Orders marked as reviewed.',
        orders: await loadOrders()
    })
})

export const updateOrderStatus = asyncHandler(async (req, res) => {
    const allowedStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled']
    const status = String(req.body.status || '').trim().toLowerCase()

    if (!allowedStatuses.includes(status)) {
        res.status(400)
        throw new Error(`Status must be one of: ${allowedStatuses.join(', ')}.`)
    }

    const order = await Order.findById(req.params.orderId)

    if (!order) {
        res.status(404)
        throw new Error('Order not found.')
    }

    order.status = status
    if (status !== 'pending') {
        order.isUnread = false
        order.reviewedAt = order.reviewedAt || new Date()
    }
    await order.save()

    res.json({
        message: 'Order status updated successfully.',
        order: serializeOrder(order)
    })
})

export const deleteOrder = asyncHandler(async (req, res) => {
    const order = await Order.findById(req.params.orderId)

    if (!order) {
        res.status(404)
        throw new Error('Order not found.')
    }

    await order.deleteOne()

    res.json({
        message: 'Order removed successfully.'
    })
})
