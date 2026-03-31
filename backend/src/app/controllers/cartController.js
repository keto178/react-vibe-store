import { asyncHandler } from '../middleware/asyncHandler.js'
import {
    addCartItem as addCartItemService,
    getCart as getCartService,
    removeCartItem as removeCartItemService,
    updateCartItem as updateCartItemService
} from '../services/cartService.js'

export const getCart = asyncHandler(async (req, res) => {
    res.json(await getCartService(req.user._id))
})

export const addCartItem = asyncHandler(async (req, res) => {
    res.status(201).json(await addCartItemService(req.user._id, req.body))
})

export const updateCartItem = asyncHandler(async (req, res) => {
    res.json(await updateCartItemService(req.user._id, req.params.itemId, req.body))
})

export const removeCartItem = asyncHandler(async (req, res) => {
    res.json(await removeCartItemService(req.user._id, req.params.itemId))
})
