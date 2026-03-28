import express from 'express'
import { uploadAsset } from '../controllers/uploadController.js'
import { authenticate, requirePhoneVerified } from '../middleware/auth.js'

const router = express.Router()

router.post('/', authenticate, requirePhoneVerified, uploadAsset)

export default router
