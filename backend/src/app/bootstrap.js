import env, { validateEnvironment } from '../config/env.js'
import { connectToDatabase, getDatabaseDebugState } from '../config/db.js'
import { ensureSystemAdminUser } from './services/systemSeedService.js'

let bootstrapPromise = null

export async function bootstrapApplication() {
    if (!bootstrapPromise) {
        bootstrapPromise = (async () => {
            validateEnvironment()
            await connectToDatabase()
            await ensureSystemAdminUser()

            console.info('[startup] Application bootstrapped successfully.', {
                nodeEnv: env.nodeEnv,
                nodeEnvSource: env.nodeEnvExplicit ? 'explicit' : 'default-development',
                storageProvider: env.storageProvider,
                database: getDatabaseDebugState()
            })
        })().catch((error) => {
            bootstrapPromise = null

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
