import express from 'express'
import { getCurrentUser, loginUser, registerUser } from '../controllers/authController.js'
import { authenticate } from '../middleware/auth.js'

const router = express.Router()

router.post('/register', registerUser)
router.post('/login', loginUser)
router.get('/me', authenticate, getCurrentUser)

export default router
