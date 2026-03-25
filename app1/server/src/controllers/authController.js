import bcrypt from 'bcryptjs'
import User from '../models/User.js'
import { asyncHandler } from '../middleware/asyncHandler.js'
import { getDatabaseDebugState } from '../config/db.js'
import { signAuthToken } from '../services/tokenService.js'
import { serializeUser } from '../utils/serializers.js'

function buildAuthRequestMeta(req) {
    return {
        ip: req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '',
        userAgent: req.headers['user-agent'] || '',
        requestId: req.headers['x-vercel-id'] || req.headers['x-request-id'] || ''
    }
}

export const registerUser = asyncHandler(async (req, res) => {
    const username = req.body?.username?.trim()
    const email = req.body?.email?.trim().toLowerCase()
    const password = req.body?.password || ''

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
    const email = req.body?.email?.trim().toLowerCase()
    const password = req.body?.password || ''
    const requestMeta = buildAuthRequestMeta(req)

    console.info('[auth/login] Received login request.', {
        ...requestMeta,
        email: email || '',
        hasPassword: Boolean(password),
        passwordLength: typeof password === 'string' ? password.length : 0
    })

    if (!email || !password) {
        res.status(400)
        throw new Error('Email and password are required.')
    }

    let user
    let passwordMatches = false

    try {
        user = await User.findOne({ email })

        if (user) {
            passwordMatches = await user.comparePassword(password)
        }
    } catch (error) {
        console.error('[auth/login] Login query failed.', {
            ...requestMeta,
            email,
            database: getDatabaseDebugState(),
            errorMessage: error.message,
            stack: error.stack || ''
        })

        res.status(500)
        throw new Error('Unable to process login right now. Please try again.')
    }

    if (!user || !passwordMatches) {
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
