import mongoose from 'mongoose'

const categorySchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true
        },
        group: {
            type: String,
            enum: ['Device', 'Liquid'],
            default: 'Device'
        },
        image: {
            type: String,
            required: true,
            trim: true
        }
    },
    {
        timestamps: true
    }
)

categorySchema.index({ name: 1, group: 1 }, { unique: true })

const Category = mongoose.model('Category', categorySchema)

export default Category
