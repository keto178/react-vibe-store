import { AppError } from '../errors/AppError.js'
import { CartRepository } from '../repositories/CartRepository.js'
import { ProductRepository } from '../repositories/ProductRepository.js'
import { serializeCartItem } from '../utils/serializers.js'

function buildCartResponse(cart) {
    const items = cart.items.map(serializeCartItem)

    return {
        items,
        cartCount: items.reduce((sum, item) => sum + item.quantity, 0)
    }
}

function assertTrackedInventory(product, quantity) {
    if (
        product?.inventoryQuantity !== null &&
        product?.inventoryQuantity !== undefined &&
        Number.isFinite(Number(product.inventoryQuantity)) &&
        Number(product.inventoryQuantity) < quantity
    ) {
        throw new AppError(409, 'CART_ITEM_OUT_OF_STOCK', `Only ${Number(product.inventoryQuantity)} item(s) are available for ${product.name}.`)
    }
}

function parseCartQuantity(rawValue, { allowZero = false, fallbackValue = 1 } = {}) {
    if (rawValue === undefined || rawValue === null || rawValue === '') {
        if (fallbackValue === null) {
            throw new AppError(400, 'CART_QUANTITY_INVALID', 'A valid quantity is required.')
        }

        return fallbackValue
    }

    const quantity = Number(rawValue)

    if (!Number.isInteger(quantity)) {
        throw new AppError(400, 'CART_QUANTITY_INVALID', 'Quantity must be a whole number.')
    }

    if (allowZero) {
        if (quantity < 0) {
            throw new AppError(400, 'CART_QUANTITY_INVALID', 'Quantity cannot be negative.')
        }

        return quantity
    }

    if (quantity <= 0) {
        throw new AppError(400, 'CART_QUANTITY_INVALID', 'Quantity must be at least 1.')
    }

    return quantity
}

export async function getCart(userId) {
    const cart = await CartRepository.findOrCreateByUserId(userId, { populate: true })

    return buildCartResponse(cart)
}

export async function addCartItem(userId, payload) {
    const product = await ProductRepository.findByIdWithCategory(payload?.productId)

    if (!product) {
        throw new AppError(404, 'PRODUCT_NOT_FOUND', 'The selected product could not be found.')
    }

    const quantityToAdd = parseCartQuantity(payload?.quantity)
    const availableColors = Array.isArray(product.colors) && product.colors.length > 0
        ? product.colors
        : ['#5dc0ff']
    const selectedColor = availableColors.includes(payload?.selectedColor)
        ? payload.selectedColor
        : availableColors[0]
    const cart = await CartRepository.findOrCreateByUserId(userId, { populate: true })
    const existingItem = cart.items.find((item) => (
        item.product?._id?.toString() === product._id.toString() &&
        item.selectedColor === selectedColor
    ))
    const nextQuantity = existingItem
        ? existingItem.quantity + quantityToAdd
        : quantityToAdd

    assertTrackedInventory(product, nextQuantity)

    if (existingItem) {
        existingItem.quantity = nextQuantity
    } else {
        cart.items.push({
            product: product._id,
            quantity: quantityToAdd,
            selectedColor
        })
    }

    await CartRepository.save(cart)
    const updatedCart = await CartRepository.findOrCreateByUserId(userId, { populate: true })

    return {
        message: 'Product added to cart.',
        ...buildCartResponse(updatedCart)
    }
}

export async function updateCartItem(userId, itemId, payload) {
    const quantity = parseCartQuantity(payload?.quantity, { allowZero: true, fallbackValue: null })

    const cart = await CartRepository.findOrCreateByUserId(userId, { populate: true })
    const item = cart.items.id(itemId)

    if (!item) {
        throw new AppError(404, 'CART_ITEM_NOT_FOUND', 'Cart item not found.')
    }

    if (quantity <= 0) {
        item.deleteOne()
    } else {
        assertTrackedInventory(item.product, quantity)
        item.quantity = quantity
    }

    await CartRepository.save(cart)
    const updatedCart = await CartRepository.findOrCreateByUserId(userId, { populate: true })

    return {
        message: 'Cart updated successfully.',
        ...buildCartResponse(updatedCart)
    }
}

export async function removeCartItem(userId, itemId) {
    const cart = await CartRepository.findOrCreateByUserId(userId, { populate: true })
    const item = cart.items.id(itemId)

    if (!item) {
        throw new AppError(404, 'CART_ITEM_NOT_FOUND', 'Cart item not found.')
    }

    item.deleteOne()
    await CartRepository.save(cart)
    const updatedCart = await CartRepository.findOrCreateByUserId(userId, { populate: true })

    return {
        message: 'Item removed from cart.',
        ...buildCartResponse(updatedCart)
    }
}
