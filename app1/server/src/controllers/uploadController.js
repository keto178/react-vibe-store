import { asyncHandler } from '../middleware/asyncHandler.js'
import { storeAssetFromDataUrl } from '../services/externalStorageService.js'

export const uploadAsset = asyncHandler(async (req, res) => {
    const dataUrl = String(req.body?.dataUrl || '').trim()
    const fileName = String(req.body?.fileName || '').trim()
    const scope = String(req.body?.scope || 'uploads').trim()

    if (!dataUrl) {
        res.status(400)
        throw new Error('File payload is required.')
    }

    const uploadResult = await storeAssetFromDataUrl({
        dataUrl,
        fileName,
        scope
    })

    res.status(201).json({
        message: 'File uploaded successfully.',
        ...uploadResult
    })
})
