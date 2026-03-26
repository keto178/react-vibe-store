import Cart from '../models/Cart.js'
import Category from '../models/Category.js'
import Product from '../models/Product.js'
import { asyncHandler } from '../middleware/asyncHandler.js'
import { serializeProduct } from '../utils/serializers.js'

const ALLOWED_NICOTINE_LEVELS = [9, 12, 30, 50]
const CATALOG_CACHE_CONTROL = 'public, s-maxage=60, stale-while-revalidate=300'

function applyCatalogCacheHeaders(res) {
    res.set('Cache-Control', CATALOG_CACHE_CONTROL)
}

async function loadProduct(productId) {
    return Product.findById(productId).populate('category')
}

function sanitizeColors(colors) {
    if (!Array.isArray(colors) || colors.length === 0) {
        return ['#5dc0ff']
    }

    return colors.map((color) => String(color).trim()).filter(Boolean)
}

function sanitizeNicotineLevels(levels, categoryGroup) {
    if (categoryGroup !== 'Liquid' || !Array.isArray(levels)) {
        return []
    }

    return Array.from(
        new Set(
            levels
                .map((level) => Number(level))
                .filter((level) => ALLOWED_NICOTINE_LEVELS.includes(level))
        )
    )
        .sort((firstLevel, secondLevel) => firstLevel - secondLevel)
        .slice(0, 2)
}

export const getProducts = asyncHandler(async (req, res) => {
    const query = {}

    if (req.query.categoryId) {
        query.category = req.query.categoryId
    }

    const products = await Product.find(query)
        .populate('category')
        .sort({ createdAt: -1 })

    const filteredProducts = req.query.group
        ? products.filter((product) => product.category?.group === req.query.group)
        : products
    const searchedProducts = req.query.search
        ? filteredProducts.filter((product) => (
            product.name.toLowerCase().includes(req.query.search.toLowerCase().trim())
        ))
        : filteredProducts

    applyCatalogCacheHeaders(res)

    res.json({
        products: searchedProducts.map(serializeProduct)
    })
})

export const getProductById = asyncHandler(async (req, res) => {
    const product = await loadProduct(req.params.productId)

    if (!product) {
        res.status(404)
        throw new Error('Product not found.')
    }

    applyCatalogCacheHeaders(res)

    res.json({
        product: serializeProduct(product)
    })
})

export const createProduct = asyncHandler(async (req, res) => {
    const name = req.body.name?.trim()
    const description = req.body.description?.trim()
    const price = Number(req.body.price)
    const image = req.body.image?.trim()
    const categoryId = req.body.categoryId
    const discount = Number(req.body.discount) || 0
    const rating = Number(req.body.rating) || 4.5
    const colors = sanitizeColors(req.body.colors)

    if (!name || !description || !image || !categoryId || Number.isNaN(price) || price <= 0) {
        res.status(400)
        throw new Error('Name, description, price, image, and category are required.')
    }

    const category = await Category.findById(categoryId)

    if (!category) {
        res.status(404)
        throw new Error('The selected category could not be found.')
    }

    const nicotineLevels = sanitizeNicotineLevels(req.body.nicotineLevels, category.group)

    if (category.group === 'Liquid' && nicotineLevels.length === 0) {
        res.status(400)
        throw new Error('Please choose at least one nicotine level for the liquid product.')
    }

    const product = await Product.create({
        name,
        description,
        price,
        image,
        category: category._id,
        discount: discount < 0 ? 0 : discount,
        colors,
        nicotineLevels,
        rating
    })

    await product.populate('category')

    res.status(201).json({
        message: 'Product created successfully.',
        product: serializeProduct(product)
    })
})

export const updateProduct = asyncHandler(async (req, res) => {
    const product = await Product.findById(req.params.productId)

    if (!product) {
        res.status(404)
        throw new Error('Product not found.')
    }

    const name = req.body.name?.trim()
    const description = req.body.description?.trim()
    const price = Number(req.body.price)
    const image = req.body.image?.trim()
    const categoryId = req.body.categoryId
    const discount = Number(req.body.discount) || 0
    const rating = Number(req.body.rating) || 4.5
    const colors = sanitizeColors(req.body.colors)

    if (!name || !description || !image || !categoryId || Number.isNaN(price) || price <= 0) {
        res.status(400)
        throw new Error('Name, description, price, image, and category are required.')
    }

    const category = await Category.findById(categoryId)

    if (!category) {
        res.status(404)
        throw new Error('The selected category could not be found.')
    }

    const nicotineLevels = sanitizeNicotineLevels(req.body.nicotineLevels, category.group)

    if (category.group === 'Liquid' && nicotineLevels.length === 0) {
        res.status(400)
        throw new Error('Please choose at least one nicotine level for the liquid product.')
    }

    product.name = name
    product.description = description
    product.price = price
    product.image = image
    product.category = category._id
    product.discount = discount < 0 ? 0 : discount
    product.colors = colors
    product.nicotineLevels = nicotineLevels
    product.rating = rating
    await product.save()
    await product.populate('category')

    res.json({
        message: 'Product updated successfully.',
        product: serializeProduct(product)
    })
})

export const deleteProduct = asyncHandler(async (req, res) => {
    const product = await Product.findById(req.params.productId)

    if (!product) {
        res.status(404)
        throw new Error('Product not found.')
    }

    await Cart.updateMany(
        {},
        {
            $pull: {
                items: {
                    product: product._id
                }
            }
        }
    )
    await product.deleteOne()

    res.json({
        message: 'Product deleted successfully.'
    })
})
