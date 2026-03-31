import env from '../../config/env.js'
import { AppError } from '../errors/AppError.js'
import { asyncHandler } from '../middleware/asyncHandler.js'
import {
    uploadAssetFromBuffer,
    uploadAssetFromDataUrl
} from '../services/uploadService.js'

export const uploadAsset = asyncHandler(async (req, res) => {
    const fileName = String(
        req.headers['x-upload-filename'] ||
        req.query?.fileName ||
        req.body?.fileName ||
        ''
    ).trim()
    const scope = String(
        req.headers['x-upload-scope'] ||
        req.query?.scope ||
        req.body?.scope ||
        'uploads'
    ).trim()
    const contentType = String(req.headers['content-type'] || '').split(';', 1)[0].trim().toLowerCase()
    const isBinaryUpload = Buffer.isBuffer(req.body) && req.body.byteLength > 0

    let uploadResult

    if (isBinaryUpload) {
        uploadResult = await uploadAssetFromBuffer({
            buffer: req.body,
            contentType,
            fileName,
            scope,
            maxBytes: env.uploadMaxBytes
        })
    } else {
        const dataUrl = String(req.body?.dataUrl || '').trim()

        if (!dataUrl) {
            throw new AppError(400, 'UPLOAD_PAYLOAD_REQUIRED', 'File payload is required.')
        }

        if (!env.allowLegacyDataUrlUploads) {
            throw new AppError(
                415,
                'UPLOAD_DATA_URL_DISABLED',
                'Legacy data URL uploads are disabled for this environment. Upload the binary file directly instead.'
            )
        }

        uploadResult = await uploadAssetFromDataUrl({
            dataUrl,
            fileName,
            scope,
            maxBytes: env.uploadMaxBytes
        })
    }

    res.status(201).json({
        message: 'File uploaded successfully.',
        ...uploadResult
    })
})
