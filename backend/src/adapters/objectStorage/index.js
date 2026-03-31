import env from '../../config/env.js'
import { AppError } from '../../app/errors/AppError.js'
import { createCloudinaryProvider } from './cloudinaryProvider.js'
import {
    createVercelBlobProvider,
    isLegacyBlobAssetUrl,
    isVercelBlobConfigured,
    readLegacyBlobAsset
} from './vercelBlobProvider.js'
import { createMockStorageProvider } from './mockStorageProvider.js'

let cachedProvider = null

function buildProvider() {
    switch (env.storageProvider) {
    case 'cloudinary':
        return createCloudinaryProvider(env)
    case 'vercel-blob':
        return createVercelBlobProvider(env)
    case 'mock':
        return createMockStorageProvider(env)
    default:
        throw new AppError(500, 'STORAGE_PROVIDER_INVALID', 'Storage provider is not configured correctly.', {
            expose: true,
            details: ['Set STORAGE_PROVIDER to cloudinary, vercel-blob, or mock.']
        })
    }
}

export function getObjectStorageProvider() {
    if (!cachedProvider) {
        cachedProvider = buildProvider()
    }

    return cachedProvider
}

export async function uploadObjectAsset(payload) {
    return getObjectStorageProvider().upload(payload)
}

export function getObjectStorageMode() {
    return getObjectStorageProvider().name
}

export function isSupportedAssetUrl(value = '') {
    const normalizedValue = String(value || '').trim()

    if (!normalizedValue) {
        return false
    }

    if (/^https?:\/\/.+/i.test(normalizedValue)) {
        return true
    }

    if (env.storageProvider === 'mock' && normalizedValue.startsWith('data:')) {
        return true
    }

    return isLegacyBlobAssetUrl(normalizedValue)
}

export function canReadLegacyBlobAssets() {
    return isVercelBlobConfigured()
}

export { readLegacyBlobAsset }
