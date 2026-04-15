import { getDatabaseDebugState } from '../../config/db.js'
import { getObjectStorageSummary } from '../../adapters/objectStorage/index.js'
import { getRuntimeBackendState } from '../../runtime/serverAppRuntime.js'

const MONGODB_CONNECTED_MESSAGE = 'MongoDB connection is active.'
const MONGODB_CONNECTING_MESSAGE = 'MongoDB connection is not ready yet.'

function buildDatabaseHealthSnapshot(database, runtimeState) {
    const isConnected = database.readyState === 1

    return {
        ...database,
        connected: isConnected,
        connectionMessage: isConnected
            ? MONGODB_CONNECTED_MESSAGE
            : MONGODB_CONNECTING_MESSAGE,
        lastAttemptAt: runtimeState.lastMongoAttemptAt,
        lastConnectedAt: runtimeState.lastMongoConnectedAt
    }
}

export function buildRuntimeHealth() {
    const runtimeState = getRuntimeBackendState()
    const objectStorage = getObjectStorageSummary()
    const database = getDatabaseDebugState()
    const databaseHealth = buildDatabaseHealthSnapshot(database, runtimeState)
    const warnings = []

    if (!objectStorage.available) {
        warnings.push('Object storage uploads are disabled until STORAGE_PROVIDER is configured correctly.')
    }

    return {
        status: 'ok',
        apiMode: 'mongodb',
        activeBackend: 'mongodb',
        primaryBackend: 'mongodb',
        persistence: 'persistent',
        catalogSource: runtimeState.bootstrap?.catalogSeed?.status === 'applied'
            ? 'database-seed'
            : 'database',
        writeAccess: true,
        fileStorage: objectStorage.mode,
        objectStorage,
        message: databaseHealth.connectionMessage,
        setupHint: '',
        warnings,
        database: databaseHealth,
        runtime: runtimeState
    }
}
