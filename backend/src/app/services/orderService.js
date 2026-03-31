import { runInTransaction } from '../../config/db.js'
import { AppError } from '../errors/AppError.js'
import { CartRepository } from '../repositories/CartRepository.js'
import { OrderRepository } from '../repositories/OrderRepository.js'
import { ProductRepository } from '../repositories/ProductRepository.js'
import { sendAdminOrderEmail } from '../../services/emailService.js'
import { calculateOrderSummary } from '../utils/order.js'
import { serializeOrder } from '../utils/serializers.js'

const REQUIRED_SHIPPING_FIELDS = [
    'fullName',
    'email',
    'phone',
    'addressLine1',
    'city',
    'state',
    'postalCode',
    'country'
]

function buildCustomer(payload = {}) {
    for (const field of REQUIRED_SHIPPING_FIELDS) {
        if (!payload[field]?.trim()) {
            throw new AppError(400, 'CHECKOUT_SHIPPING_REQUIRED', `Shipping field "${field}" is required.`)
        }
    }

    return {
        fullName: payload.fullName.trim(),
        email: payload.email.trim(),
        phone: payload.phone.trim(),
        addressLine1: payload.addressLine1.trim(),
        addressLine2: payload.addressLine2?.trim() || '',
        city: payload.city.trim(),
        state: payload.state.trim(),
        postalCode: payload.postalCode.trim(),
        country: payload.country.trim(),
        notes: payload.notes?.trim() || ''
    }
}

function buildOrderItemSnapshot(cartItem) {
    const product = cartItem.product
    const category = product?.category

    if (!product || !category) {
        throw new AppError(409, 'CHECKOUT_PRODUCT_UNAVAILABLE', 'One or more items in your cart are no longer available.')
    }

    if (
        product.inventoryQuantity !== null &&
        product.inventoryQuantity !== undefined &&
        Number.isFinite(Number(product.inventoryQuantity)) &&
        Number(product.inventoryQuantity) < cartItem.quantity
    ) {
        throw new AppError(409, 'CHECKOUT_OUT_OF_STOCK', `${product.name} does not have enough stock for this checkout.`)
    }

    return {
        product: product._id,
        name: product.name,
        description: product.description,
        price: product.price,
        discount: product.discount || 0,
        image: product.image,
        quantity: cartItem.quantity,
        selectedColor: cartItem.selectedColor,
        category: category.name,
        categoryId: category._id.toString(),
        type: category.group === 'Liquid' ? 'Liquid' : 'Device'
    }
}

async function applyInventoryAdjustments(cartItems, session) {
    for (const cartItem of cartItems) {
        const product = cartItem.product

        if (
            product?.inventoryQuantity === null ||
            product?.inventoryQuantity === undefined ||
            !Number.isFinite(Number(product.inventoryQuantity))
        ) {
            continue
        }

        product.inventoryQuantity = Math.max(0, Number(product.inventoryQuantity) - Number(cartItem.quantity))
        await ProductRepository.save(product, { session })
    }
}

export async function checkout(user, payload) {
    const customer = buildCustomer(payload)
    const order = await runInTransaction(async (session) => {
        const cart = await CartRepository.findOrCreateByUserId(user._id, {
            session,
            populate: true
        })

        if (!cart || cart.items.length === 0) {
            throw new AppError(400, 'CHECKOUT_CART_EMPTY', 'Your cart is empty. Add products before checking out.')
        }

        const orderItems = cart.items.map(buildOrderItemSnapshot)

        if (orderItems.length === 0) {
            throw new AppError(400, 'CHECKOUT_CART_EMPTY', 'No valid cart items were available for checkout.')
        }

        await applyInventoryAdjustments(cart.items, session)

        const createdOrder = await OrderRepository.create({
            user: user._id,
            items: orderItems,
            customer,
            customerSession: {
                userId: user._id,
                username: user.username,
                email: user.email
            },
            summary: calculateOrderSummary(orderItems),
            status: 'pending',
            emailNotification: {
                status: 'pending',
                message: ''
            },
            isUnread: true
        }, { session })

        cart.items = []
        await CartRepository.save(cart, { session })

        return createdOrder
    })

    const serializedOrder = serializeOrder(order)
    let emailNotification

    try {
        emailNotification = await sendAdminOrderEmail(serializedOrder)
    } catch (error) {
        console.error('[orders/email] Failed to send admin order email.', {
            orderId: order._id?.toString?.() || '',
            errorMessage: error.message,
            stack: error.stack || ''
        })
        emailNotification = {
            status: 'failed',
            message: error.message
        }
    }

    try {
        await OrderRepository.updateEmailNotification(order._id, emailNotification)
    } catch (error) {
        console.error('[orders/email] Failed to persist email notification status.', {
            orderId: order._id?.toString?.() || '',
            errorMessage: error.message,
            stack: error.stack || ''
        })
    }

    serializedOrder.emailNotification = emailNotification

    return {
        message: 'Order placed successfully.',
        order: serializedOrder
    }
}

export async function getOrdersForCurrentUser(userId) {
    const orders = await OrderRepository.list({ user: userId })

    return {
        orders: orders.map(serializeOrder)
    }
}

export async function getAllOrders() {
    const orders = await OrderRepository.list()

    return {
        orders: orders.map(serializeOrder)
    }
}

export async function markOrdersAsSeen() {
    await OrderRepository.markAllSeen()

    return {
        message: 'Orders marked as reviewed.',
        ...(await getAllOrders())
    }
}

export async function updateOrderStatus(orderId, payload) {
    const allowedStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled']
    const status = String(payload?.status || '').trim().toLowerCase()

    if (!allowedStatuses.includes(status)) {
        throw new AppError(400, 'ORDER_STATUS_INVALID', `Status must be one of: ${allowedStatuses.join(', ')}.`)
    }

    const order = await OrderRepository.findById(orderId)

    if (!order) {
        throw new AppError(404, 'ORDER_NOT_FOUND', 'Order not found.')
    }

    const updatedOrder = await OrderRepository.updateById(orderId, {
        status,
        ...(status !== 'pending'
            ? {
                isUnread: false,
                reviewedAt: order.reviewedAt || new Date()
            }
            : {})
    })

    return {
        message: 'Order status updated successfully.',
        order: serializeOrder(updatedOrder)
    }
}

export async function deleteOrder(orderId) {
    const order = await OrderRepository.deleteById(orderId)

    if (!order) {
        throw new AppError(404, 'ORDER_NOT_FOUND', 'Order not found.')
    }

    return {
        message: 'Order removed successfully.'
    }
}
