import mongoose from 'mongoose'

const cartItemSchema = new mongoose.Schema(
    {
        product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product',
            required: true
        },
        quantity: {
            type: Number,
            default: 1,
            min: 1
        },
        selectedColor: {
            type: String,
            default: '#5dc0ff'
        }
    },
    {
        timestamps: true
    }
)

const cartSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            unique: true
        },
        items: {
            type: [cartItemSchema],
            default: []
        }
    },
    {
        timestamps: true
    }
)

const Cart = mongoose.model('Cart', cartSchema)

export default Cart
