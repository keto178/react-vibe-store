let selectedAppPromise = null
let coreModulesPromise = null
let fallbackModulesPromise = null
let hasLoggedStartupDiagnostics = false

const isVercelDeployment = process.env.VERCEL === '1'

function buildRequestMeta(req) {
    return {
        method: req.method,
        path: req.url,
        requestId: req.headers['x-vercel-id'] || req.headers['x-request-id'] || ''
    }
}

function applyCachePolicy(req, res) {
    // Keep API responses strongly consistent with recent writes.
    // Catalog endpoints are updated from the dashboard and should not be served stale.
    res.setHeader('Cache-Control', 'no-store')
}

async function loadCoreServerModules() {
    if (!coreModulesPromise) {
        coreModulesPromise = Promise.all([
            import('../app1/server/src/app.js'),
            import('../app1/server/src/config/db.js'),
            import('../app1/server/src/config/env.js'),
            import('../app1/server/src/services/seedService.js')
        ]).then(([appModule, dbModule, envModule, seedModule]) => ({
            app: appModule.default,
            connectToDatabase: dbModule.connectToDatabase,
            getDatabaseDebugState: dbModule.getDatabaseDebugState,
            getConfigDiagnostics: envModule.getConfigDiagnostics,
            seedDefaults: seedModule.seedDefaults
        })).catch((error) => {
            coreModulesPromise = null
            throw error
        })
    }

    return coreModulesPromise
}

async function loadFallbackModules() {
    if (!fallbackModulesPromise) {
        fallbackModulesPromise = import('../app1/server/src/fileApp.js')
            .then((fallbackModule) => ({
                fileApp: fallbackModule.default,
                prepareFileApi: fallbackModule.prepareFileApi
            }))
            .catch((error) => {
                fallbackModulesPromise = null
                throw error
            })
    }

    return fallbackModulesPromise
}

function logStartupDiagnostics(diagnostics) {
    if (hasLoggedStartupDiagnostics) {
        return
    }

    hasLoggedStartupDiagnostics = true

    if (diagnostics.missing.length > 0) {
        console.error('[api/startup] Missing environment variables.', diagnostics)
        return
    }

    if (diagnostics.warnings.length > 0) {
        console.warn('[api/startup] Environment warnings.', diagnostics)
    } else {
        console.info('[api/startup] Environment diagnostics passed.', diagnostics)
    }
}

async function resolveServerApp() {
    const {
        app,
        connectToDatabase,
        getDatabaseDebugState,
        getConfigDiagnostics,
        seedDefaults
    } = await loadCoreServerModules()

    logStartupDiagnostics(getConfigDiagnostics())

    try {
        await connectToDatabase()
        await seedDefaults()
        console.info('[api/startup] Using MongoDB-backed API app.', {
            database: getDatabaseDebugState()
        })
        return app
    } catch (error) {
        const shouldUseFallback = !isVercelDeployment && process.env.NODE_ENV !== 'production'
        const isMissingMongoUri = String(error.message || '').includes('MongoDB URI is not configured')

        console.error('[api/startup] MongoDB startup failed. Attempting fallback app.', {
            isVercelDeployment,
            shouldUseFallback,
            database: getDatabaseDebugState(),
            errorMessage: error.message,
            stack: error.stack || ''
        })

        if (!shouldUseFallback) {
            throw new Error(
                isMissingMongoUri
                    ? 'Database connection failed: MONGODB_URI is missing in server environment.'
                    : 'Database connection failed. Fallback storage is disabled in production deployments.'
            )
        }

        try {
            const {
                fileApp,
                prepareFileApi
            } = await loadFallbackModules()

            await prepareFileApi()
            console.warn('[api/startup] Using fallback in-memory API app.')
            return fileApp
        } catch (fallbackError) {
            console.error('[api/startup] Fallback API app failed to initialize.', {
                errorMessage: fallbackError.message,
                stack: fallbackError.stack || ''
            })
            throw fallbackError
        }
    }
}

async function getSelectedApp() {
    if (!selectedAppPromise) {
        selectedAppPromise = resolveServerApp().catch((error) => {
            selectedAppPromise = null
            throw error
        })
    }

    return selectedAppPromise
}

export default async function handler(req, res) {
    try {
        applyCachePolicy(req, res)

        const selectedApp = await getSelectedApp()
        return selectedApp(req, res)
    } catch (error) {
        console.error('[api/request] Request failed before response was sent.', {
            ...buildRequestMeta(req),
            errorMessage: error.message,
            stack: error.stack || ''
        })

        if (!res.headersSent) {
            const errorMessage = String(error.message || '')
            const isDatabaseStartupFailure = errorMessage.includes('Database connection failed')
            const isMissingMongoUri = errorMessage.includes('MONGODB_URI is missing')

            res.status(isDatabaseStartupFailure ? 503 : 500).json({
                message: isDatabaseStartupFailure
                    ? (isMissingMongoUri
                        ? 'Database configuration is incomplete. Please set MONGODB_URI in server environment variables.'
                        : 'Database is temporarily unavailable. Please try again shortly.')
                    : 'The API could not process this request. Check server logs for details.',
                code: isDatabaseStartupFailure
                    ? (isMissingMongoUri ? 'DB_CONFIG_MISSING' : 'DB_UNAVAILABLE')
                    : 'API_REQUEST_FAILED',
                requestId: req.headers['x-vercel-id'] || req.headers['x-request-id'] || undefined
            })
        }
    }
}
