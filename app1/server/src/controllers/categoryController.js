import Cart from '../models/Cart.js'
import Category from '../models/Category.js'
import Product from '../models/Product.js'
import { asyncHandler } from '../middleware/asyncHandler.js'
import { serializeCategory } from '../utils/serializers.js'

const CATALOG_CACHE_CONTROL = 'no-store'

export const getCategories = asyncHandler(async (req, res) => {
    const categories = await Category.find().sort({ group: 1, name: 1 })

    res.set('Cache-Control', CATALOG_CACHE_CONTROL)

    res.json({
        categories: categories.map(serializeCategory)
    })
})

export const createCategory = asyncHandler(async (req, res) => {
    const name = req.body.name?.trim()
    const group = req.body.group === 'Liquid' ? 'Liquid' : 'Device'
    const image = req.body.image?.trim()

    if (!name || !image) {
        res.status(400)
        throw new Error('Category name and image are required.')
    }

    const existingCategory = await Category.findOne({ name, group })

    if (existingCategory) {
        res.status(409)
        throw new Error('This category already exists in the selected list.')
    }

    const category = await Category.create({
        name,
        group,
        image
    })

    res.status(201).json({
        message: 'Category created successfully.',
        category: serializeCategory(category)
    })
})

export const updateCategory = asyncHandler(async (req, res) => {
    const category = await Category.findById(req.params.categoryId)

    if (!category) {
        res.status(404)
        throw new Error('Category not found.')
    }

    const nextName = req.body.name?.trim()
    const nextGroup = req.body.group === 'Liquid' ? 'Liquid' : 'Device'
    const nextImage = req.body.image?.trim()

    if (!nextName || !nextImage) {
        res.status(400)
        throw new Error('Category name and image are required.')
    }

    const duplicateCategory = await Category.findOne({
        _id: { $ne: category._id },
        name: nextName,
        group: nextGroup
    })

    if (duplicateCategory) {
        res.status(409)
        throw new Error('Another category with the same name already exists in this list.')
    }

    category.name = nextName
    category.group = nextGroup
    category.image = nextImage
    await category.save()

    if (nextGroup !== 'Liquid') {
        await Product.updateMany(
            { category: category._id },
            {
                $set: {
                    nicotineLevels: []
                }
            }
        )
    }

    res.json({
        message: 'Category updated successfully.',
        category: serializeCategory(category)
    })
})

export const deleteCategory = asyncHandler(async (req, res) => {
    const category = await Category.findById(req.params.categoryId)

    if (!category) {
        res.status(404)
        throw new Error('Category not found.')
    }

    const relatedProducts = await Product.find({ category: category._id }).select('_id')
    const relatedProductIds = relatedProducts.map((product) => product._id)

    if (relatedProductIds.length > 0) {
        await Product.deleteMany({ category: category._id })
        await Cart.updateMany(
            {},
            {
                $pull: {
                    items: {
                        product: { $in: relatedProductIds }
                    }
                }
            }
        )
    }

    await category.deleteOne()

    res.json({
        message: 'Category and its related products were removed.'
    })
})
