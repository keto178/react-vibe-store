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
    const requestPath = String(req.url || '').split('?')[0]
    const isCatalogRequest = req.method === 'GET' && (
        requestPath === '/api/products' ||
        requestPath === '/api/categories' ||
        requestPath.startsWith('/api/products/') ||
        requestPath.startsWith('/api/categories/')
    )

    if (isCatalogRequest) {
        res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300')
        return
    }

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
        console.error('[api/startup] MongoDB startup failed. Attempting fallback app.', {
            isVercelDeployment,
            database: getDatabaseDebugState(),
            errorMessage: error.message,
            stack: error.stack || ''
        })

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
            res.status(500).json({
                message: 'The API could not process this request. Check server logs for details.',
                requestId: req.headers['x-vercel-id'] || req.headers['x-request-id'] || undefined
            })
        }
    }
}
