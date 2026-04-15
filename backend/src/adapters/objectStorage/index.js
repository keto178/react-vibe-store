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

function buildStorageSummary() {
    if (!env.storageProvider) {
        return {
            mode: 'disabled',
            configured: false,
            available: false,
            reason: 'STORAGE_PROVIDER is not configured.',
            details: ['Set STORAGE_PROVIDER to cloudinary or vercel-blob to enable uploads.']
        }
    }

    switch (env.storageProvider) {
    case 'cloudinary':
        if (!env.cloudinaryCloudName || !env.cloudinaryApiKey || !env.cloudinaryApiSecret) {
            return {
                mode: 'cloudinary',
                configured: false,
                available: false,
                reason: 'Cloudinary configuration is incomplete.',
                details: [
                    'CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET are required when STORAGE_PROVIDER=cloudinary.'
                ]
            }
        }

        return {
            mode: 'cloudinary',
            configured: true,
            available: true,
            reason: '',
            details: []
        }

    case 'vercel-blob':
        if (!env.blobReadWriteToken) {
            return {
                mode: 'vercel-blob',
                configured: false,
                available: false,
                reason: 'Vercel Blob configuration is incomplete.',
                details: ['BLOB_READ_WRITE_TOKEN is required when STORAGE_PROVIDER=vercel-blob.']
            }
        }

        return {
            mode: 'vercel-blob',
            configured: true,
            available: true,
            reason: '',
            details: []
        }

    case 'mock':
        if (env.isProduction) {
            return {
                mode: 'mock',
                configured: false,
                available: false,
                reason: 'Mock storage is not allowed in production.',
                details: ['Use cloudinary or vercel-blob in production.']
            }
        }

        if (!env.enableDevMockStorage) {
            return {
                mode: 'mock',
                configured: false,
                available: false,
                reason: 'Mock storage is disabled.',
                details: ['ENABLE_DEV_MOCK_STORAGE=true is required when STORAGE_PROVIDER=mock.']
            }
        }

        return {
            mode: 'mock',
            configured: true,
            available: true,
            reason: '',
            details: []
        }

    default:
        return {
            mode: 'invalid',
            configured: false,
            available: false,
            reason: 'Storage provider value is invalid.',
            details: ['Set STORAGE_PROVIDER to cloudinary, vercel-blob, or mock.']
        }
    }
}

function buildProvider() {
    switch (env.storageProvider) {
    case 'cloudinary':
        return createCloudinaryProvider(env)
    case 'vercel-blob':
        return createVercelBlobProvider(env)
    case 'mock':
        return createMockStorageProvider(env)
    default:
        return null
    }
}

export function getObjectStorageSummary() {
    return buildStorageSummary()
}

export function getObjectStorageProvider() {
    const summary = getObjectStorageSummary()

    if (!summary.available) {
        throw new AppError(503, 'OBJECT_STORAGE_UNAVAILABLE', 'Upload storage is not configured for this deployment.', {
            expose: true,
            details: summary.details
        })
    }

    if (!cachedProvider) {
        cachedProvider = buildProvider()
    }

    if (!cachedProvider) {
        throw new AppError(503, 'OBJECT_STORAGE_UNAVAILABLE', 'Upload storage is not configured for this deployment.', {
            expose: true,
            details: summary.details
        })
    }

    return cachedProvider
}

export async function uploadObjectAsset(payload) {
    return getObjectStorageProvider().upload(payload)
}

export function getObjectStorageMode() {
    return getObjectStorageSummary().mode
}

export function isSupportedAssetUrl(value = '') {
    const normalizedValue = String(value || '').trim()

    if (!normalizedValue) {
        return false
    }

    if (/^https?:\/\/.+/i.test(normalizedValue)) {
        return true
    }

    if (getObjectStorageMode() === 'mock' && normalizedValue.startsWith('data:')) {
        return true
    }

    return isLegacyBlobAssetUrl(normalizedValue)
}

export function canReadLegacyBlobAssets() {
    return isVercelBlobConfigured()
}

export { readLegacyBlobAsset }
