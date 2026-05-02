import mongoose from 'mongoose'

const orderItemSchema = new mongoose.Schema(
    {
        product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product',
            default: null
        },
        name: {
            type: String,
            required: true
        },
        description: {
            type: String,
            default: ''
        },
        price: {
            type: Number,
            required: true
        },
        discount: {
            type: Number,
            default: 0
        },
        image: {
            type: String,
            default: ''
        },
        quantity: {
            type: Number,
            required: true
        },
        selectedColor: {
            type: String,
            default: '#5dc0ff'
        },
        category: {
            type: String,
            default: ''
        },
        categoryId: {
            type: String,
            default: ''
        },
        type: {
            type: String,
            default: 'Device'
        }
    },
    {
        timestamps: false
    }
)

const customerSchema = new mongoose.Schema(
    {
        fullName: {
            type: String,
            required: true
        },
        email: {
            type: String,
            required: true
        },
        phone: {
            type: String,
            required: true
        },
        addressLine1: {
            type: String,
            required: true
        },
        addressLine2: {
            type: String,
            default: ''
        },
        city: {
            type: String,
            required: true
        },
        state: {
            type: String,
            required: true
        },
        postalCode: {
            type: String,
            required: true
        },
        country: {
            type: String,
            required: true
        },
        notes: {
            type: String,
            default: ''
        }
    },
    {
        _id: false
    }
)

const summarySchema = new mongoose.Schema(
    {
        itemCount: {
            type: Number,
            default: 0
        },
        subtotal: {
            type: Number,
            default: 0
        },
        shippingFee: {
            type: Number,
            default: 0
        },
        total: {
            type: Number,
            default: 0
        }
    },
    {
        _id: false
    }
)

const emailNotificationSchema = new mongoose.Schema(
    {
        status: {
            type: String,
            enum: ['pending', 'sent', 'failed', 'skipped'],
            default: 'pending'
        },
        message: {
            type: String,
            default: ''
        }
    },
    {
        _id: false
    }
)

const customerSessionSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null
        },
        username: {
            type: String,
            default: ''
        },
        email: {
            type: String,
            default: ''
        }
    },
    {
        _id: false
    }
)

const orderSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null
        },
        items: {
            type: [orderItemSchema],
            default: []
        },
        customer: {
            type: customerSchema,
            required: true
        },
        customerSession: {
            type: customerSessionSchema,
            default: null
        },
        summary: {
            type: summarySchema,
            required: true
        },
        status: {
            type: String,
            enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'],
            default: 'pending'
        },
        emailNotification: {
            type: emailNotificationSchema,
            default: () => ({
                status: 'pending',
                message: ''
            })
        },
        isUnread: {
            type: Boolean,
            default: true
        },
        reviewedAt: {
            type: Date,
            default: null
        }
    },
    {
        timestamps: true
    }
)

orderSchema.index({ user: 1, createdAt: -1 })
orderSchema.index({ status: 1, createdAt: -1 })
orderSchema.index({ isUnread: 1, createdAt: -1 })

const Order = mongoose.models.Order || mongoose.model('Order', orderSchema)

export default Order
