import Cart from '../models/Cart.js'
import Product from '../models/Product.js'
import { asyncHandler } from '../middleware/asyncHandler.js'
import { serializeCartItem } from '../utils/serializers.js'

async function populateCart(cartId) {
    const cart = await Cart.findById(cartId).populate({
        path: 'items.product',
        populate: {
            path: 'category'
        }
    })

    if (!cart) {
        return null
    }

    const validItems = cart.items.filter((item) => item.product)

    if (validItems.length !== cart.items.length) {
        cart.items = validItems
        await cart.save()
        await cart.populate({
            path: 'items.product',
            populate: {
                path: 'category'
            }
        })
    }

    return cart
}

async function getOrCreateCart(userId) {
    let cart = await Cart.findOne({ user: userId })

    if (!cart) {
        cart = await Cart.create({
            user: userId,
            items: []
        })
    }

    return populateCart(cart._id)
}

function buildCartResponse(cart) {
    const items = cart.items.map(serializeCartItem)

    return {
        items,
        cartCount: items.reduce((sum, item) => sum + item.quantity, 0)
    }
}

export const getCart = asyncHandler(async (req, res) => {
    const cart = await getOrCreateCart(req.user._id)

    res.json(buildCartResponse(cart))
})

export const addCartItem = asyncHandler(async (req, res) => {
    const product = await Product.findById(req.body.productId).populate('category')

    if (!product) {
        res.status(404)
        throw new Error('The selected product could not be found.')
    }

    const quantityToAdd = Math.max(1, Number(req.body.quantity) || 1)
    const availableColors = Array.isArray(product.colors) && product.colors.length > 0
        ? product.colors
        : ['#5dc0ff']
    const selectedColor = availableColors.includes(req.body.selectedColor)
        ? req.body.selectedColor
        : availableColors[0]
    const cart = await getOrCreateCart(req.user._id)
    const existingItem = cart.items.find((item) => (
        item.product?._id?.toString() === product._id.toString() &&
        item.selectedColor === selectedColor
    ))

    if (existingItem) {
        existingItem.quantity += quantityToAdd
    } else {
        cart.items.push({
            product: product._id,
            quantity: quantityToAdd,
            selectedColor
        })
    }

    await cart.save()
    const updatedCart = await populateCart(cart._id)

    res.status(201).json({
        message: 'Product added to cart.',
        ...buildCartResponse(updatedCart)
    })
})

export const updateCartItem = asyncHandler(async (req, res) => {
    const quantity = Number(req.body.quantity)

    if (Number.isNaN(quantity)) {
        res.status(400)
        throw new Error('A valid quantity is required.')
    }

    const cart = await getOrCreateCart(req.user._id)
    const item = cart.items.id(req.params.itemId)

    if (!item) {
        res.status(404)
        throw new Error('Cart item not found.')
    }

    if (quantity <= 0) {
        item.deleteOne()
    } else {
        item.quantity = quantity
    }

    await cart.save()
    const updatedCart = await populateCart(cart._id)

    res.json({
        message: 'Cart updated successfully.',
        ...buildCartResponse(updatedCart)
    })
})

export const removeCartItem = asyncHandler(async (req, res) => {
    const cart = await getOrCreateCart(req.user._id)
    const item = cart.items.id(req.params.itemId)

    if (!item) {
        res.status(404)
        throw new Error('Cart item not found.')
    }

    item.deleteOne()
    await cart.save()
    const updatedCart = await populateCart(cart._id)

    res.json({
        message: 'Item removed from cart.',
        ...buildCartResponse(updatedCart)
    })
})
