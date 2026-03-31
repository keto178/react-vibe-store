import mongoose from 'mongoose'

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
        },
        imageMetadata: {
            type: imageMetadataSchema,
            default: null
        }
    },
    {
        timestamps: true
    }
)

categorySchema.index({ name: 1, group: 1 }, { unique: true })
categorySchema.index({ group: 1, createdAt: -1 })

const Category = mongoose.models.Category || mongoose.model('Category', categorySchema)

export default Category
