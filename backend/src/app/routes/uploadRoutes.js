import express from 'express'
import env from '../../config/env.js'
import { uploadAsset } from '../controllers/uploadController.js'
import { authenticate, requirePhoneVerified } from '../middleware/auth.js'

const router = express.Router()

router.post(
    '/',
    authenticate,
    requirePhoneVerified,
    express.raw({
        type: ['application/octet-stream', 'image/*'],
        limit: env.uploadMaxBytes
    }),
    uploadAsset
)

export default router
