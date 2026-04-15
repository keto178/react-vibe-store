import {
    recordFallbackBackendActivation,
    shouldAttemptMongoBootstrap
} from '../backend/src/runtime/serverAppRuntime.js'
import env from '../backend/src/config/env.js'

let coreModulesPromise = null
let fallbackModulesPromise = null
let backendSelectionPromise = null

function buildRequestMeta(req) {
    return {
        method: req.method,
        path: req.url,
        requestId: req.headers['x-vercel-id'] || req.headers['x-request-id'] || ''
    }
}

function applyCachePolicy(req, res) {
    res.setHeader('Cache-Control', 'no-store')
}

function shouldUseFallbackApp(error) {
    return error?.code === 'DATABASE_UNAVAILABLE' || error?.code === 'DATABASE_CONFIG_MISSING'
}

function buildStartupErrorResponse(error) {
    if (error?.code === 'ENV_VALIDATION_FAILED') {
        return {
            statusCode: 500,
            payload: {
                message: 'Server configuration is incomplete. Review the backend environment variables.',
                code: error.code,
                details: error.details || []
            }
        }
    }

    if (error?.code === 'DATABASE_UNAVAILABLE' || error?.code === 'DATABASE_CONFIG_MISSING') {
        return {
            statusCode: 503,
            payload: {
                message: 'Database is temporarily unavailable. Please try again shortly.',
                code: error.code
            }
        }
    }

    return {
        statusCode: 500,
        payload: {
            message: 'The API could not process this request. Check server logs for details.',
            code: error?.code || 'API_STARTUP_FAILED'
        }
    }
}

function createFallbackRetryAt() {
    return new Date(Date.now() + env.mongoFallbackRetryDelayMs).toISOString()
}

async function loadCoreServerModules() {
    if (!coreModulesPromise) {
        coreModulesPromise = Promise.all([
            import('../backend/src/app.js'),
            import('../backend/src/app/bootstrap.js'),
            import('../backend/src/config/db.js')
        ]).then(([appModule, bootstrapModule, dbModule]) => ({
            app: appModule.default,
            bootstrapApplication: bootstrapModule.bootstrapApplication,
            getDatabaseDebugState: dbModule.getDatabaseDebugState
        })).catch((error) => {
            coreModulesPromise = null
            throw error
        })
    }

    return coreModulesPromise
}

async function loadFallbackModules() {
    if (!fallbackModulesPromise) {
        fallbackModulesPromise = Promise.all([
            import('../backend/src/fileApp.js'),
            import('../backend/src/services/fileStore.js')
        ]).then(([fallbackModule, fileStoreModule]) => ({
            app: fallbackModule.default,
            prepareFileApi: fallbackModule.prepareFileApi,
            getFileStorageMode: fileStoreModule.getFileStorageMode
        })).catch((error) => {
            fallbackModulesPromise = null
            throw error
        })
    }

    return fallbackModulesPromise
}

async function getPreparedFallbackApp() {
    const fallbackModules = await loadFallbackModules()
    await fallbackModules.prepareFileApi()
    return fallbackModules
}

async function selectPrimaryOrFallbackApp() {
    if (!backendSelectionPromise) {
        backendSelectionPromise = (async () => {
            const coreModules = await loadCoreServerModules()

            try {
                await coreModules.bootstrapApplication()
                return coreModules.app
            } catch (error) {
                if (!shouldUseFallbackApp(error)) {
                    throw error
                }

                const fallbackModules = await getPreparedFallbackApp()

                recordFallbackBackendActivation({
                    error,
                    database: coreModules.getDatabaseDebugState(),
                    fallbackBackend: fallbackModules.getFileStorageMode(),
                    retryAt: createFallbackRetryAt()
                })

                return fallbackModules.app
            }
        })().finally(() => {
            backendSelectionPromise = null
        })
    }

    return backendSelectionPromise
}

async function resolveServerApp() {
    const coreModules = await loadCoreServerModules()
    const database = coreModules.getDatabaseDebugState()

    if (database.readyState === 1) {
        return coreModules.app
    }

    if (!shouldAttemptMongoBootstrap()) {
        const fallbackModules = await loadFallbackModules()
        return fallbackModules.app
    }

    return selectPrimaryOrFallbackApp()
}

export default async function handler(req, res) {
    try {
        applyCachePolicy(req, res)

        const selectedApp = await resolveServerApp()
        return selectedApp(req, res)
    } catch (error) {
        console.error('[api/request] Request failed before response was sent.', {
            ...buildRequestMeta(req),
            errorMessage: error.message,
            code: error.code || '',
            details: error.details || [],
            stack: error.stack || ''
        })

        if (!res.headersSent) {
            const failure = buildStartupErrorResponse(error)
            res.status(failure.statusCode).json({
                ...failure.payload,
                requestId: req.headers['x-vercel-id'] || req.headers['x-request-id'] || undefined
            })
        }
    }
}
