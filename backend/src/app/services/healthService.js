import { getDatabaseDebugState } from '../../config/db.js'
import { getObjectStorageMode } from '../../adapters/objectStorage/index.js'

export function buildRuntimeHealth() {
    return {
        status: 'ok',
        apiMode: 'mongodb',
        persistence: 'persistent',
        catalogSource: 'database',
        writeAccess: true,
        fileStorage: getObjectStorageMode(),
        message: '',
        setupHint: '',
        warnings: [],
        database: getDatabaseDebugState()
    }
}
