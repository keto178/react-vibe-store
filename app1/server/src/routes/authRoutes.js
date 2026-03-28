import express from 'express'
import {
    getCurrentUser,
    loginUser,
    registerUser,
    requestPhoneVerificationCode,
    verifyPhoneCode
} from '../controllers/authController.js'
import { authenticate } from '../middleware/auth.js'

const router = express.Router()

router.post('/register', registerUser)
router.post('/login', loginUser)
router.get('/me', authenticate, getCurrentUser)
router.post('/phone/request-code', authenticate, requestPhoneVerificationCode)
router.post('/phone/verify-code', authenticate, verifyPhoneCode)

export default router
