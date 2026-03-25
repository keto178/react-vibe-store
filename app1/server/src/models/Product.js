import mongoose from 'mongoose'

const ALLOWED_NICOTINE_LEVELS = [9, 12, 30, 50]

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

const Product = mongoose.model('Product', productSchema)

export default Product
