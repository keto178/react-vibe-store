import express from 'express'
import {
    getCurrentUser,
    loginUser,
    requestEmailVerificationCode,
    registerUser,
    verifyEmailCode,
    requestPhoneVerificationCode,
    verifyPhoneCode
} from '../controllers/authController.js'
import { authenticate } from '../middleware/auth.js'

const router = express.Router()

router.post('/register', registerUser)
router.post('/login', loginUser)
router.get('/me', authenticate, getCurrentUser)
router.post('/email/request-code', authenticate, requestEmailVerificationCode)
router.post('/email/verify-code', authenticate, verifyEmailCode)
router.post('/phone/request-code', authenticate, requestPhoneVerificationCode)
router.post('/phone/verify-code', authenticate, verifyPhoneCode)

export default router
