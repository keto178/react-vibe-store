import { get, put } from '@vercel/blob'
import { randomUUID } from 'node:crypto'

const BLOB_ASSET_CACHE_SECONDS = 60 * 60 * 24 * 30
const LEGACY_BLOB_ASSET_ROUTE_PREFIX = '/api/assets/blob'

function getSafeFileStem(fileName = '') {
    return String(fileName || 'file')
        .trim()
        .replace(/\.[^/.]+$/, '')
        .replace(/[^a-zA-Z0-9_-]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 80) || 'file'
}

function getSafeFileExtension(fileName = '', contentType = '') {
    const normalizedFileName = String(fileName || '').trim()
    const extensionMatch = normalizedFileName.match(/(\.[a-zA-Z0-9]+)$/)

    if (extensionMatch) {
        return extensionMatch[1].toLowerCase()
    }

    switch (String(contentType || '').toLowerCase()) {
    case 'image/jpeg':
        return '.jpg'
    case 'image/png':
        return '.png'
    case 'image/webp':
        return '.webp'
    case 'image/gif':
        return '.gif'
    case 'image/svg+xml':
        return '.svg'
    case 'image/avif':
        return '.avif'
    default:
        return ''
    }
}

function normalizeScope(scope = '') {
    return String(scope || 'uploads')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9/_-]+/g, '-')
        .replace(/\/+/g, '/')
        .replace(/^-|-$/g, '') || 'uploads'
}

export function isVercelBlobConfigured() {
    return Boolean(process.env.BLOB_READ_WRITE_TOKEN)
}

export function isLegacyBlobAssetUrl(value = '') {
    const trimmedValue = String(value || '').trim()

    if (!trimmedValue) {
        return false
    }

    return (
        trimmedValue.startsWith(`${LEGACY_BLOB_ASSET_ROUTE_PREFIX}?`) ||
        /^https?:\/\/.+\/api\/assets\/blob\?pathname=/i.test(trimmedValue)
    )
}

export function createVercelBlobProvider() {
    return {
        name: 'vercel-blob',

        async upload({ buffer, contentType, fileName = '', scope = 'uploads', mimeType }) {
            const normalizedScope = normalizeScope(scope)
            const safeFileStem = getSafeFileStem(fileName)
            const fileExtension = getSafeFileExtension(fileName, contentType || mimeType)
            const pathname = `${normalizedScope}/${Date.now()}-${randomUUID().slice(0, 10)}-${safeFileStem}${fileExtension}`
            const blobResult = await put(pathname, buffer, {
                access: 'public',
                addRandomSuffix: false,
                cacheControlMaxAge: BLOB_ASSET_CACHE_SECONDS,
                contentType: contentType || mimeType || 'application/octet-stream'
            })

            return {
                url: blobResult.url,
                storage: 'vercel-blob',
                publicId: blobResult.pathname,
                bytes: buffer.byteLength,
                mimeType: contentType || mimeType || 'application/octet-stream'
            }
        }
    }
}

export async function readLegacyBlobAsset(pathname) {
    return get(pathname, {
        access: 'private',
        useCache: true
    })
}
