import { getExternalStorageMode } from './externalStorageService.js'
import { getFileCatalogSource, getFileStorageMode } from './fileStore.js'

export const TEMPORARY_PREVIEW_MESSAGE = (
    'This deployment is running in temporary preview mode without MongoDB. The catalog comes from bundled seed data and saving is disabled until the database is configured.'
)

export const LOCAL_FILE_STORAGE_MESSAGE = (
    'The API is running in local file-storage mode because MongoDB is unavailable. Changes are saved only on this machine.'
)

export function buildMongoRuntimeHealth() {
    return {
        status: 'ok',
        storage: 'mongodb',
        apiMode: 'mongodb',
        persistence: 'persistent',
        catalogSource: 'database',
        writeAccess: true,
        fileStorage: getExternalStorageMode(),
        message: '',
        warnings: []
    }
}

export function buildFallbackRuntimeHealth() {
    const storage = getFileStorageMode()
    const isTemporaryPreview = storage === 'memory'

    return {
        status: 'ok',
        storage,
        apiMode: storage,
        persistence: isTemporaryPreview ? 'temporary' : 'local',
        catalogSource: getFileCatalogSource(),
        writeAccess: !isTemporaryPreview,
        fileStorage: getExternalStorageMode(),
        message: isTemporaryPreview ? TEMPORARY_PREVIEW_MESSAGE : LOCAL_FILE_STORAGE_MESSAGE,
        warnings: isTemporaryPreview
            ? ['Writes are disabled until MongoDB is configured for the deployment.']
            : ['MongoDB is unavailable locally, so this environment is using a machine-local runtime store.']
    }
}
