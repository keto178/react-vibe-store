import { AppError } from '../errors/AppError.js'
import {
    canReadLegacyBlobAssets,
    getObjectStorageMode,
    isSupportedAssetUrl,
    readLegacyBlobAsset,
    uploadObjectAsset
} from '../../adapters/objectStorage/index.js'

const DATA_URL_PATTERN = /^data:([^;,]+)?(;base64)?,([\s\S]+)$/
const ALLOWED_UPLOAD_MIME_TYPES = new Set([
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/svg+xml',
    'image/avif'
])

function normalizeMimeType(value = '') {
    return String(value || '').split(';', 1)[0].trim().toLowerCase()
}

function sanitizeFileName(fileName = '') {
    return String(fileName || '')
        .trim()
        .replace(/[<>:"/\\|?*\u0000-\u001F]+/g, '-')
        .slice(0, 120)
}

function normalizeUploadScope(scope = '') {
    return String(scope || 'uploads').trim() || 'uploads'
}

function assertAllowedUploadMimeType(mimeType = '') {
    const normalizedMimeType = normalizeMimeType(mimeType)

    if (!ALLOWED_UPLOAD_MIME_TYPES.has(normalizedMimeType)) {
        throw new AppError(
            400,
            'UPLOAD_CONTENT_TYPE_INVALID',
            'Only JPEG, PNG, WebP, GIF, SVG, and AVIF images are supported.'
        )
    }

    return normalizedMimeType
}

function assertUploadSize(bytes, maxBytes) {
    if (Number.isFinite(Number(maxBytes)) && Number(maxBytes) > 0 && bytes > Number(maxBytes)) {
        throw new AppError(
            400,
            'UPLOAD_TOO_LARGE',
            `File is too large. Max size is ${Math.floor(Number(maxBytes) / (1024 * 1024))}MB.`
        )
    }
}

function buildUploadMetadata(uploadResult = {}, fileName = '') {
    return {
        storage: String(uploadResult.storage || '').trim(),
        publicId: String(uploadResult.publicId || '').trim(),
        bytes: Number(uploadResult.bytes) || 0,
        mimeType: normalizeMimeType(uploadResult.mimeType),
        originalFileName: sanitizeFileName(fileName),
        uploadedAt: new Date().toISOString()
    }
}

function attachUploadMetadata(uploadResult, fileName = '') {
    const assetMetadata = buildUploadMetadata(uploadResult, fileName)

    return {
        ...uploadResult,
        originalFileName: assetMetadata.originalFileName,
        uploadedAt: assetMetadata.uploadedAt,
        assetMetadata
    }
}

function parseDataUrl(dataUrl = '') {
    const match = String(dataUrl || '').match(DATA_URL_PATTERN)

    if (!match) {
        throw new AppError(400, 'UPLOAD_PAYLOAD_INVALID', 'Invalid file payload. Expected a data URL.')
    }

    const mimeType = assertAllowedUploadMimeType(match[1] || 'application/octet-stream')
    const isBase64 = Boolean(match[2])
    const payload = match[3] || ''
    const buffer = isBase64
        ? Buffer.from(payload, 'base64')
        : Buffer.from(decodeURIComponent(payload), 'utf8')

    return {
        mimeType,
        bytes: buffer.byteLength,
        buffer
    }
}

export function assertManagedAssetUrl(value, entityLabel = 'Asset') {
    if (!isSupportedAssetUrl(value)) {
        throw new AppError(
            400,
            'ASSET_URL_INVALID',
            `${entityLabel} must be uploaded through /api/uploads using the configured object storage provider.`
        )
    }
}

function isLegacyDataUrl(value = '') {
    return String(value || '').trim().startsWith('data:')
}

export function isAllowedExistingAssetValue(nextValue, currentValue) {
    const normalizedNextValue = String(nextValue || '').trim()
    const normalizedCurrentValue = String(currentValue || '').trim()

    return Boolean(
        normalizedNextValue &&
        normalizedCurrentValue &&
        normalizedNextValue === normalizedCurrentValue &&
        isLegacyDataUrl(normalizedCurrentValue)
    )
}

export async function uploadAssetFromDataUrl({ dataUrl, fileName = '', scope = 'uploads', maxBytes }) {
    const { mimeType, bytes, buffer } = parseDataUrl(dataUrl)

    assertUploadSize(bytes, maxBytes)

    const sanitizedFileName = sanitizeFileName(fileName)
    const uploadResult = await uploadObjectAsset({
        dataUrl,
        buffer,
        bytes,
        contentType: mimeType,
        mimeType,
        fileName: sanitizedFileName,
        scope: normalizeUploadScope(scope)
    })

    return attachUploadMetadata(uploadResult, sanitizedFileName)
}

export async function uploadAssetFromBuffer({
    buffer,
    contentType,
    fileName = '',
    scope = 'uploads',
    maxBytes
}) {
    if (!Buffer.isBuffer(buffer) || buffer.byteLength === 0) {
        throw new AppError(400, 'UPLOAD_PAYLOAD_INVALID', 'A non-empty binary upload is required.')
    }

    const mimeType = assertAllowedUploadMimeType(contentType)
    const bytes = buffer.byteLength

    assertUploadSize(bytes, maxBytes)

    const sanitizedFileName = sanitizeFileName(fileName)
    const uploadResult = await uploadObjectAsset({
        buffer,
        bytes,
        contentType: mimeType,
        mimeType,
        fileName: sanitizedFileName,
        scope: normalizeUploadScope(scope)
    })

    return attachUploadMetadata(uploadResult, sanitizedFileName)
}

export function sanitizePersistedUploadMetadata(rawMetadata) {
    if (!rawMetadata || typeof rawMetadata !== 'object') {
        return null
    }

    const storage = String(rawMetadata.storage || '').trim().toLowerCase()
    const publicId = String(rawMetadata.publicId || '').trim()
    const bytes = Number(rawMetadata.bytes)
    const mimeType = normalizeMimeType(rawMetadata.mimeType)
    const originalFileName = sanitizeFileName(rawMetadata.originalFileName)
    const uploadedAtValue = rawMetadata.uploadedAt ? new Date(rawMetadata.uploadedAt) : null
    const hasAnyMetadataValue = Boolean(
        storage ||
        publicId ||
        mimeType ||
        originalFileName ||
        rawMetadata.bytes !== undefined ||
        rawMetadata.uploadedAt
    )

    if (storage && !['cloudinary', 'vercel-blob', 'mock'].includes(storage)) {
        throw new AppError(400, 'ASSET_METADATA_INVALID', 'Asset storage metadata is invalid.')
    }

    if (hasAnyMetadataValue && !storage) {
        throw new AppError(400, 'ASSET_METADATA_INVALID', 'Asset storage metadata must include the storage provider.')
    }

    if (mimeType && !ALLOWED_UPLOAD_MIME_TYPES.has(mimeType)) {
        throw new AppError(400, 'ASSET_METADATA_INVALID', 'Asset MIME metadata is invalid.')
    }

    if (rawMetadata.uploadedAt && (!uploadedAtValue || Number.isNaN(uploadedAtValue.valueOf()))) {
        throw new AppError(400, 'ASSET_METADATA_INVALID', 'Asset upload timestamp metadata is invalid.')
    }

    return {
        storage,
        publicId,
        bytes: Number.isFinite(bytes) && bytes >= 0 ? Math.floor(bytes) : 0,
        mimeType,
        originalFileName,
        uploadedAt: uploadedAtValue instanceof Date && !Number.isNaN(uploadedAtValue.valueOf())
            ? uploadedAtValue
            : null
    }
}

export function getUploadStorageMode() {
    return getObjectStorageMode()
}

export function supportsLegacyBlobAssetReads() {
    return canReadLegacyBlobAssets()
}

export { isSupportedAssetUrl, readLegacyBlobAsset }
