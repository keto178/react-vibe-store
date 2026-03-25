import bcrypt from 'bcryptjs'
import User from '../models/User.js'
import { asyncHandler } from '../middleware/asyncHandler.js'
import { signAuthToken } from '../services/tokenService.js'
import { serializeUser } from '../utils/serializers.js'

export const registerUser = asyncHandler(async (req, res) => {
    const username = req.body.username?.trim()
    const email = req.body.email?.trim().toLowerCase()
    const password = req.body.password || ''

    if (!username || !email || !password) {
        res.status(400)
        throw new Error('Username, email, and password are required.')
    }

    if (password.length < 6) {
        res.status(400)
        throw new Error('Password must be at least 6 characters long.')
    }

    const existingUser = await User.findOne({
        $or: [
            { email },
            { username: username.toLowerCase() }
        ]
    })

    if (existingUser) {
        res.status(409)
        throw new Error('A user with this email or username already exists.')
    }

    const passwordHash = await bcrypt.hash(password, 10)
    const user = await User.create({
        username: username.toLowerCase(),
        email,
        passwordHash,
        role: 'user'
    })

    res.status(201).json({
        message: 'Registration successful.',
        token: signAuthToken(user),
        user: serializeUser(user)
    })
})

export const loginUser = asyncHandler(async (req, res) => {
    const email = req.body.email?.trim().toLowerCase()
    const password = req.body.password || ''

    if (!email || !password) {
        res.status(400)
        throw new Error('Email and password are required.')
    }

    const user = await User.findOne({ email })

    if (!user || !(await user.comparePassword(password))) {
        res.status(401)
        throw new Error('Incorrect email or password.')
    }

    res.json({
        message: 'Login successful.',
        token: signAuthToken(user),
        user: serializeUser(user)
    })
})

export const getCurrentUser = asyncHandler(async (req, res) => {
    res.json({
        user: serializeUser(req.user)
    })
})
