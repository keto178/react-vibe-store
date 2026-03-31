import mongoose from 'mongoose'

const ALLOWED_NICOTINE_LEVELS = [9, 12, 30, 50]

const imageMetadataSchema = new mongoose.Schema(
    {
        storage: {
            type: String,
            default: ''
        },
        publicId: {
            type: String,
            default: ''
        },
        bytes: {
            type: Number,
            default: 0,
            min: 0
        },
        mimeType: {
            type: String,
            default: ''
        },
        originalFileName: {
            type: String,
            default: ''
        },
        uploadedAt: {
            type: Date,
            default: null
        }
    },
    {
        _id: false
    }
)

const productSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true
        },
        description: {
            type: String,
            required: true,
            trim: true
        },
        price: {
            type: Number,
            required: true,
            min: 0
        },
        discount: {
            type: Number,
            default: 0,
            min: 0
        },
        image: {
            type: String,
            required: true,
            trim: true
        },
        imageMetadata: {
            type: imageMetadataSchema,
            default: null
        },
        category: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Category',
            required: true
        },
        colors: {
            type: [String],
            default: ['#5dc0ff']
        },
        nicotineLevels: {
            type: [Number],
            default: [],
            validate: {
                validator(levels) {
                    return Array.isArray(levels) &&
                        levels.length <= 2 &&
                        levels.every((level) => ALLOWED_NICOTINE_LEVELS.includes(level))
                },
                message: 'Nicotine levels must use the allowed values only.'
            }
        },
        inventoryQuantity: {
            type: Number,
            default: null,
            min: 0
        },
        rating: {
            type: Number,
            default: 4.5,
            min: 0,
            max: 5
        }
    },
    {
        timestamps: true
    }
)

productSchema.index({ category: 1, createdAt: -1 })
productSchema.index({ category: 1, inventoryQuantity: 1 })

const Product = mongoose.models.Product || mongoose.model('Product', productSchema)

export default Product
