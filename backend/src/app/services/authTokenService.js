import jwt from 'jsonwebtoken'
import env from '../../config/env.js'
import { AppError } from '../errors/AppError.js'

export function signAuthToken(user) {
    const userId = user?._id?.toString?.() || user?.id || ''

    return jwt.sign(
        {
            sub: userId,
            userId,
            role: user?.role || 'user'
        },
        env.jwtSecret,
        {
            algorithm: 'HS256',
            expiresIn: env.jwtExpiresIn
        }
    )
}

export function verifyAuthToken(token) {
    try {
        const payload = jwt.verify(token, env.jwtSecret, {
            algorithms: ['HS256']
        })

        return {
            userId: payload?.userId || payload?.sub || '',
            role: payload?.role || 'user'
        }
    } catch {
        throw new AppError(401, 'AUTH_INVALID', 'Your session is invalid or expired. Please log in again.')
    }
}
