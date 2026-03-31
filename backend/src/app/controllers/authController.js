import { asyncHandler } from '../middleware/asyncHandler.js'
import {
    getCurrentUser as getCurrentUserService,
    loginUser as loginUserService,
    registerUser as registerUserService,
    requestPhoneVerificationCode as requestPhoneVerificationCodeService,
    verifyPhoneCode as verifyPhoneCodeService
} from '../services/authService.js'

export const registerUser = asyncHandler(async (req, res) => {
    res.status(201).json(await registerUserService(req.body))
})

export const loginUser = asyncHandler(async (req, res) => {
    res.json(await loginUserService(req.body, {
        ip: req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '',
        userAgent: req.headers['user-agent'] || '',
        requestId: req.requestId || ''
    }))
})

export const getCurrentUser = asyncHandler(async (req, res) => {
    res.json(getCurrentUserService(req.user))
})

export const requestPhoneVerificationCode = asyncHandler(async (req, res) => {
    res.status(201).json(await requestPhoneVerificationCodeService(req.user, req.body))
})

export const verifyPhoneCode = asyncHandler(async (req, res) => {
    res.json(await verifyPhoneCodeService(req.user, req.body))
})
