import { getObjectStorageSummary } from '../adapters/objectStorage/index.js'
import { getRuntimeBackendState } from '../runtime/serverAppRuntime.js'
import { getFileCatalogSource, getFileStorageMode } from './fileStore.js'

export const TEMPORARY_PREVIEW_MESSAGE = (
    'This deployment is running in temporary preview mode without MongoDB. The catalog comes from bundled seed data and saving is disabled until MongoDB Atlas is configured.'
)

export const VERCEL_BLOB_FALLBACK_MESSAGE = (
    'MongoDB Atlas is not configured yet, so this deployment is using Vercel Blob fallback storage for persistent catalog updates.'
)

export const VERCEL_BLOB_RUNTIME_FAILURE_MESSAGE = (
    'MongoDB Atlas is temporarily unavailable, so this deployment is using Vercel Blob fallback storage for persistent catalog updates.'
)

export const LOCAL_FILE_STORAGE_MESSAGE = (
    'The API is running in local file-storage mode because MongoDB is unavailable. Changes are saved only on this machine.'
)

function buildFallbackDatabaseMessage({ configured, fallbackReason }) {
    if (!configured) {
        return 'MongoDB connection string is not configured.'
    }

    if (fallbackReason === 'mongodb_connection_failed') {
        return 'MongoDB connection could not be established.'
    }

    return 'MongoDB connection is not active.'
}

function getFallbackSetupHint({ fallbackReason, isTemporaryPreview }) {
    if (fallbackReason === 'mongodb_connection_failed') {
        return 'Check MongoDB Atlas network access, credentials, and cluster health. The API will retry MongoDB automatically.'
    }

    if (fallbackReason === 'mongodb_config_missing') {
        return 'Add MONGODB_URI to restore the primary persistent MongoDB backend for this deployment.'
    }

    return isTemporaryPreview
        ? 'Add MONGODB_URI to restore the primary persistent MongoDB backend for this deployment.'
        : ''
}

export function buildFallbackRuntimeHealth() {
    const runtimeState = getRuntimeBackendState()
    const storage = getFileStorageMode()
    const isTemporaryPreview = storage === 'memory'
    const isBlobFallback = storage === 'blob'
    const objectStorage = getObjectStorageSummary()
    const fallbackReason = runtimeState.lastMongoFailure?.reason || runtimeState.fallbackReason || ''
    const fallbackWarnings = []
    const database = {
        ...runtimeState.database,
        connected: runtimeState.database.readyState === 1,
        connectionMessage: buildFallbackDatabaseMessage({
            configured: runtimeState.database.configured,
            fallbackReason
        }),
        lastAttemptAt: runtimeState.lastMongoAttemptAt,
        lastConnectedAt: runtimeState.lastMongoConnectedAt,
        lastFailureAt: runtimeState.lastMongoFailureAt
    }

    if (!objectStorage.available) {
        fallbackWarnings.push('Object storage uploads are disabled until STORAGE_PROVIDER is configured correctly.')
    }

    if (isBlobFallback) {
        return {
            status: 'ok',
            storage,
            apiMode: storage,
            activeBackend: storage,
            primaryBackend: 'mongodb',
            persistence: 'persistent',
            catalogSource: getFileCatalogSource(),
            writeAccess: true,
            fileStorage: objectStorage.mode,
            objectStorage,
            message: fallbackReason === 'mongodb_connection_failed'
                ? VERCEL_BLOB_RUNTIME_FAILURE_MESSAGE
                : VERCEL_BLOB_FALLBACK_MESSAGE,
            setupHint: getFallbackSetupHint({ fallbackReason, isTemporaryPreview }),
            warnings: [
                'MongoDB Atlas is unavailable for this deployment, so Vercel Blob fallback storage is active.',
                ...fallbackWarnings
            ],
            database,
            runtime: runtimeState
        }
    }

    return {
        status: 'ok',
        storage,
        apiMode: storage,
        activeBackend: storage,
        primaryBackend: 'mongodb',
        persistence: isTemporaryPreview ? 'temporary' : 'local',
        catalogSource: getFileCatalogSource(),
        writeAccess: !isTemporaryPreview,
        fileStorage: objectStorage.mode,
        objectStorage,
        message: isTemporaryPreview ? TEMPORARY_PREVIEW_MESSAGE : LOCAL_FILE_STORAGE_MESSAGE,
        setupHint: getFallbackSetupHint({ fallbackReason, isTemporaryPreview }),
        warnings: isTemporaryPreview
            ? [
                'Writes are disabled until MongoDB Atlas is configured for the deployment.',
                ...fallbackWarnings
            ]
            : [
                'MongoDB is unavailable locally, so this environment is using a machine-local runtime store.',
                ...fallbackWarnings
            ],
        database,
        runtime: runtimeState
    }
}
