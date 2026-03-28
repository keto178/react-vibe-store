import { get, put } from '@vercel/blob'
import { randomUUID } from 'node:crypto'

const RUNTIME_STORE_BLOB_PATHNAME = 'app1/runtime-store.json'
const BLOB_JSON_CACHE_SECONDS = 60
const BLOB_ASSET_CACHE_SECONDS = 60 * 60 * 24 * 30
const BLOB_ASSET_ROUTE_PREFIX = '/api/assets/blob'

function hasBlobReadWriteToken() {
    return Boolean(process.env.BLOB_READ_WRITE_TOKEN)
}

function isBlobFallbackForced() {
    return process.env.APP1_USE_BLOB_FALLBACK === '1'
}

function isServerlessDeployment() {
    return process.env.VERCEL === '1'
}

export function isBlobRuntimeStoreEnabled() {
    return hasBlobReadWriteToken() && (isServerlessDeployment() || isBlobFallbackForced())
}

export function isBlobAssetStorageAvailable() {
    return hasBlobReadWriteToken()
}

export function buildBlobAssetUrl(pathname = '') {
    const params = new URLSearchParams({
        pathname: String(pathname || '').trim()
    })

    return `${BLOB_ASSET_ROUTE_PREFIX}?${params.toString()}`
}

export function isBlobAssetUrl(value = '') {
    const trimmedValue = String(value || '').trim()

    if (!trimmedValue) {
        return false
    }

    return (
        trimmedValue.startsWith(`${BLOB_ASSET_ROUTE_PREFIX}?`) ||
        /^https?:\/\/.+\/api\/assets\/blob\?pathname=/i.test(trimmedValue)
    )
}

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

async function readBlobText(pathname, options) {
    const blobResult = await get(pathname, options)

    if (!blobResult?.stream) {
        return null
    }

    return new Response(blobResult.stream).text()
}

export async function readRuntimeStoreBlob() {
    const rawContents = await readBlobText(RUNTIME_STORE_BLOB_PATHNAME, {
        access: 'private',
        useCache: false
    })

    if (!rawContents) {
        return null
    }

    return JSON.parse(rawContents)
}

export async function writeRuntimeStoreBlob(store) {
    const payload = JSON.stringify(store, null, 2)

    return put(RUNTIME_STORE_BLOB_PATHNAME, payload, {
        access: 'private',
        addRandomSuffix: false,
        allowOverwrite: true,
        cacheControlMaxAge: BLOB_JSON_CACHE_SECONDS,
        contentType: 'application/json'
    })
}

export async function uploadBlobAsset({
    buffer,
    contentType,
    fileName = '',
    scope = 'uploads'
}) {
    const normalizedScope = normalizeScope(scope)
    const safeFileStem = getSafeFileStem(fileName)
    const fileExtension = getSafeFileExtension(fileName, contentType)
    const pathname = `${normalizedScope}/${Date.now()}-${randomUUID().slice(0, 10)}-${safeFileStem}${fileExtension}`

    const blobResult = await put(pathname, buffer, {
        access: 'private',
        addRandomSuffix: false,
        cacheControlMaxAge: BLOB_ASSET_CACHE_SECONDS,
        contentType
    })

    return {
        ...blobResult,
        url: buildBlobAssetUrl(blobResult.pathname)
    }
}

export async function readBlobAsset(pathname) {
    return get(pathname, {
        access: 'private',
        useCache: true
    })
}
