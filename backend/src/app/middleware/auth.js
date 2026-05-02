import { AppError } from '../errors/AppError.js'
import { UserRepository } from '../repositories/UserRepository.js'
import { asyncHandler } from './asyncHandler.js'
import { verifyAuthToken } from '../services/authTokenService.js'

function extractBearerToken(authorizationHeader = '') {
    const normalizedHeader = String(authorizationHeader || '').trim()

    if (!normalizedHeader) {
        return ''
    }

    const [scheme, token] = normalizedHeader.split(/\s+/, 2)

    if (scheme !== 'Bearer' || !token) {
        return ''
    }

    return token.trim()
}

export const authenticate = asyncHandler(async (req, res, next) => {
    const token = extractBearerToken(req.headers.authorization)

    if (!token) {
        throw new AppError(401, 'AUTH_REQUIRED', 'Authentication is required.')
    }

    const decodedToken = verifyAuthToken(token)
    const userId = decodedToken.userId

    if (!userId) {
        throw new AppError(401, 'AUTH_INVALID', 'Your session is invalid or expired. Please log in again.')
    }

    const user = await UserRepository.findById(userId)

    if (!user) {
        throw new AppError(401, 'AUTH_USER_NOT_FOUND', 'The account for this session no longer exists.')
    }

    req.user = user
    next()
})

export const optionalAuthenticate = asyncHandler(async (req, res, next) => {
    const token = extractBearerToken(req.headers.authorization)

    if (!token) {
        next()
        return
    }

    const decodedToken = verifyAuthToken(token)
    const userId = decodedToken.userId

    if (!userId) {
        throw new AppError(401, 'AUTH_INVALID', 'Your session is invalid or expired. Please log in again.')
    }

    const user = await UserRepository.findById(userId)

    if (!user) {
        throw new AppError(401, 'AUTH_USER_NOT_FOUND', 'The account for this session no longer exists.')
    }

    req.user = user
    next()
})

export function requireVerifiedSessionIfAuthenticated(req, res, next) {
    if (!req.user) {
        next()
        return
    }

    requirePhoneVerified(req, res, next)
}

export function requireAdmin(req, res, next) {
    if (req.user?.role !== 'admin') {
        next(new AppError(403, 'ADMIN_REQUIRED', 'Admin access is required for this action.'))
        return
    }

    next()
}

export function requirePhoneVerified(req, res, next) {
    if (req.user?.role === 'admin' || req.user?.emailVerified) {
        next()
        return
    }

    next(new AppError(403, 'EMAIL_VERIFICATION_REQUIRED', 'Email verification is required to continue.'))
}
