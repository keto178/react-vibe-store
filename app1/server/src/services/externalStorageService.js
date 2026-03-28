import { createHash, randomUUID } from 'node:crypto'
import env from '../config/env.js'
import {
    isBlobAssetUrl,
    isBlobAssetStorageAvailable,
    uploadBlobAsset
} from './vercelBlobService.js'

const DATA_URL_PATTERN = /^data:([^;,]+)?(;base64)?,([\s\S]+)$/

function getSafeFileStem(fileName = '') {
    return String(fileName || 'file')
        .trim()
        .replace(/\.[^/.]+$/, '')
        .replace(/[^a-zA-Z0-9_-]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 80) || 'file'
}

function normalizeScope(scope = '') {
    return String(scope || 'uploads')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9/_-]+/g, '-')
        .replace(/\/+/g, '/')
        .replace(/^-|-$/g, '') || 'uploads'
}

function parseDataUrl(dataUrl = '') {
    const match = String(dataUrl || '').match(DATA_URL_PATTERN)

    if (!match) {
        throw new Error('Invalid file payload. Expected a data URL.')
    }

    const mimeType = match[1] || 'application/octet-stream'
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

function hasCloudinaryConfiguration() {
    return Boolean(
        env.cloudinaryCloudName &&
        env.cloudinaryApiKey &&
        env.cloudinaryApiSecret
    )
}

function getMaxUploadBytes() {
    const maxBytes = Number(env.uploadMaxBytes)
    return Number.isFinite(maxBytes) && maxBytes > 0 ? maxBytes : 10 * 1024 * 1024
}

function createCloudinarySignature(params) {
    const signatureBase = Object.entries(params)
        .filter(([, value]) => value !== undefined && value !== null && value !== '')
        .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
        .map(([key, value]) => `${key}=${value}`)
        .join('&')

    return createHash('sha1')
        .update(`${signatureBase}${env.cloudinaryApiSecret}`)
        .digest('hex')
}

async function uploadToCloudinary({ dataUrl, fileName, scope }) {
    const timestamp = Math.floor(Date.now() / 1000)
    const folder = `${String(env.cloudinaryFolder || 'react-work').replace(/\/+$/, '')}/${normalizeScope(scope)}`
    const publicId = `${folder}/${getSafeFileStem(fileName)}-${randomUUID().slice(0, 10)}`
    const signature = createCloudinarySignature({
        folder,
        public_id: publicId,
        timestamp
    })
    const formData = new FormData()

    formData.set('file', dataUrl)
    formData.set('api_key', env.cloudinaryApiKey)
    formData.set('timestamp', String(timestamp))
    formData.set('folder', folder)
    formData.set('public_id', publicId)
    formData.set('signature', signature)

    const response = await fetch(
        `https://api.cloudinary.com/v1_1/${env.cloudinaryCloudName}/auto/upload`,
        {
            method: 'POST',
            body: formData
        }
    )
    const payload = await response.json().catch(() => ({}))

    if (!response.ok || !payload?.secure_url) {
        throw new Error(payload?.error?.message || 'External upload provider rejected the file.')
    }

    return {
        url: payload.secure_url,
        storage: 'cloudinary',
        publicId: payload.public_id || '',
        bytes: Number(payload.bytes) || 0,
        mimeType: payload.resource_type === 'image'
            ? `image/${payload.format || 'jpeg'}`
            : (payload.format || 'application/octet-stream')
    }
}

export function isExternalStorageRequired() {
    return env.nodeEnv === 'production' || process.env.VERCEL === '1'
}

export function getExternalStorageMode() {
    if (hasCloudinaryConfiguration()) {
        return 'cloudinary'
    }

    if (isBlobAssetStorageAvailable()) {
        return 'vercel-blob'
    }

    return isExternalStorageRequired() ? 'disabled' : 'inline-dev'
}

export function isExternalAssetUrl(value = '') {
    const normalizedValue = String(value || '').trim()

    return /^https?:\/\/.+/i.test(normalizedValue) || isBlobAssetUrl(normalizedValue)
}

export async function storeAssetFromDataUrl({ dataUrl, fileName = '', scope = 'uploads' }) {
    const { mimeType, bytes, buffer } = parseDataUrl(dataUrl)
    const maxUploadBytes = getMaxUploadBytes()

    if (bytes > maxUploadBytes) {
        throw new Error(`File is too large. Max size is ${Math.floor(maxUploadBytes / (1024 * 1024))}MB.`)
    }

    if (hasCloudinaryConfiguration()) {
        const result = await uploadToCloudinary({
            dataUrl,
            fileName,
            scope
        })

        return {
            ...result,
            mimeType
        }
    }

    if (isBlobAssetStorageAvailable()) {
        const blobResult = await uploadBlobAsset({
            buffer,
            contentType: mimeType,
            fileName,
            scope
        })

        return {
            url: blobResult.url,
            storage: 'vercel-blob',
            publicId: blobResult.pathname,
            bytes,
            mimeType
        }
    }

    if (isExternalStorageRequired()) {
        throw new Error('External storage is not configured. Set Cloudinary credentials or connect Vercel Blob before uploading files.')
    }

    return {
        url: dataUrl,
        storage: 'inline-dev',
        publicId: '',
        bytes,
        mimeType
    }
}
