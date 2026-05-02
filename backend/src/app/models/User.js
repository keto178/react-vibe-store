import bcrypt from 'bcryptjs'
import mongoose from 'mongoose'

const userSchema = new mongoose.Schema(
    {
        username: {
            type: String,
            required: true,
            trim: true,
            minlength: 2,
            maxlength: 50
        },
        email: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            lowercase: true
        },
        passwordHash: {
            type: String,
            required: true
        },
        role: {
            type: String,
            enum: ['user', 'admin'],
            default: 'user'
        },
        emailVerified: {
            type: Boolean,
            default: false
        },
        emailVerifiedAt: {
            type: Date,
            default: null
        },
        emailVerification: {
            codeHash: {
                type: String,
                default: ''
            },
            attempts: {
                type: Number,
                default: 0
            },
            requestedAt: {
                type: Date,
                default: null
            },
            expiresAt: {
                type: Date,
                default: null
            }
        },
        phoneNumberEncrypted: {
            type: String,
            default: ''
        },
        phoneNumberLast4: {
            type: String,
            default: ''
        },
        phoneVerified: {
            type: Boolean,
            default: false
        },
        phoneVerifiedAt: {
            type: Date,
            default: null
        },
        phoneVerification: {
            codeHash: {
                type: String,
                default: ''
            },
            attempts: {
                type: Number,
                default: 0
            },
            requestedAt: {
                type: Date,
                default: null
            },
            expiresAt: {
                type: Date,
                default: null
            }
        }
    },
    {
        timestamps: true
    }
)

userSchema.index({ username: 1 }, { unique: true })

userSchema.methods.comparePassword = function comparePassword(password) {
    return bcrypt.compare(password, this.passwordHash)
}

const User = mongoose.models.User || mongoose.model('User', userSchema)

export default User
