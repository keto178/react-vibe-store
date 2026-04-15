import env, { validateEnvironment } from '../config/env.js'
import { connectToDatabase, getDatabaseDebugState } from '../config/db.js'
import { getObjectStorageSummary } from '../adapters/objectStorage/index.js'
import {
    recordMongoBackendReady,
    recordMongoBootstrapAttempt,
    recordMongoBootstrapFailure
} from '../runtime/serverAppRuntime.js'
import { ensureCatalogSeedData } from './services/catalogSeedService.js'
import { ensureSystemAdminUser } from './services/systemSeedService.js'

let bootstrapPromise = null

export async function bootstrapApplication() {
    const databaseState = getDatabaseDebugState()

    if (bootstrapPromise && databaseState.readyState !== 0) {
        return bootstrapPromise
    }

    if (!bootstrapPromise || databaseState.readyState === 0) {
        bootstrapPromise = (async () => {
            recordMongoBootstrapAttempt({
                database: getDatabaseDebugState()
            })
            validateEnvironment()
            await connectToDatabase()
            const adminBootstrap = await ensureSystemAdminUser()
            const catalogSeed = await ensureCatalogSeedData()
            const database = getDatabaseDebugState()
            const objectStorage = getObjectStorageSummary()
            const bootstrapSummary = {
                nodeEnv: env.nodeEnv,
                nodeEnvSource: env.nodeEnvExplicit ? 'explicit' : 'default-development',
                objectStorage,
                database,
                adminBootstrap,
                catalogSeed
            }

            recordMongoBackendReady({
                database,
                bootstrap: {
                    adminBootstrap,
                    catalogSeed
                }
            })

            console.info('[startup] Application bootstrapped successfully.', {
                ...bootstrapSummary,
                storageProvider: objectStorage.mode
            })

            return bootstrapSummary
        })().catch((error) => {
            bootstrapPromise = null
            recordMongoBootstrapFailure({
                error,
                database: getDatabaseDebugState()
            })

            console.error('[startup] Application bootstrap failed.', {
                code: error.code || '',
                message: error.message,
                details: error.details || [],
                stack: error.stack || ''
            })

            throw error
        })
    }

    return bootstrapPromise
}
