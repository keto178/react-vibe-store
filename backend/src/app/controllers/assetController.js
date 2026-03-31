import { AppError } from '../errors/AppError.js'
import { asyncHandler } from '../middleware/asyncHandler.js'
import { readLegacyBlobAsset, supportsLegacyBlobAssetReads } from '../services/uploadService.js'

export const getLegacyBlobAsset = asyncHandler(async (req, res) => {
    const pathname = String(req.query?.pathname || '').trim()

    if (!pathname) {
        throw new AppError(400, 'ASSET_PATH_REQUIRED', 'Blob asset pathname is required.')
    }

    if (!supportsLegacyBlobAssetReads()) {
        throw new AppError(404, 'ASSET_NOT_AVAILABLE', 'Legacy blob asset reads are not configured for this deployment.')
    }

    const assetResult = await readLegacyBlobAsset(pathname)

    if (!assetResult?.stream || assetResult.statusCode !== 200) {
        throw new AppError(404, 'ASSET_NOT_FOUND', 'Blob asset not found.')
    }

    const assetBuffer = Buffer.from(await new Response(assetResult.stream).arrayBuffer())

    res.set('Cache-Control', assetResult.blob?.cacheControl || 'public, max-age=31536000, immutable')
    res.set('Content-Disposition', assetResult.blob?.contentDisposition || 'inline')
    res.type(assetResult.blob?.contentType || 'application/octet-stream')
    res.send(assetBuffer)
})
