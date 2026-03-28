import jwt from 'jsonwebtoken'
import env from '../config/env.js'
import User from '../models/User.js'
import { asyncHandler } from './asyncHandler.js'

function extractBearerToken(authorizationHeader = '') {
    if (!authorizationHeader.startsWith('Bearer ')) {
        return ''
    }

    return authorizationHeader.slice(7).trim()
}

export const authenticate = asyncHandler(async (req, res, next) => {
    const token = extractBearerToken(req.headers.authorization)

    if (!token) {
        res.status(401)
        throw new Error('Authentication is required.')
    }

    let decodedToken

    try {
        decodedToken = jwt.verify(token, env.jwtSecret)
    } catch {
        res.status(401)
        throw new Error('Your session is invalid or expired. Please log in again.')
    }

    const user = await User.findById(decodedToken.userId)

    if (!user) {
        res.status(401)
        throw new Error('The account for this session no longer exists.')
    }

    req.user = user
    next()
})

export function requireAdmin(req, res, next) {
    if (req.user?.role !== 'admin') {
        res.status(403)
        throw new Error('Admin access is required for this action.')
    }

    next()
}

export function requirePhoneVerified(req, res, next) {
    if (req.user?.role === 'admin') {
        next()
        return
    }

    if (req.user?.phoneVerified) {
        next()
        return
    }

    res.status(403)
    throw new Error('Phone verification is required to continue.')
}
