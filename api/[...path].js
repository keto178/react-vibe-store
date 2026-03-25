import app from '../app1/server/src/app.js'
import { connectToDatabase, getDatabaseDebugState } from '../app1/server/src/config/db.js'
import { getConfigDiagnostics } from '../app1/server/src/config/env.js'
import fileApp, { prepareFileApi } from '../app1/server/src/fileApp.js'
import { seedDefaults } from '../app1/server/src/services/seedService.js'

const isVercelDeployment = process.env.VERCEL === '1'
let selectedAppPromise = null
let hasLoggedStartupDiagnostics = false

function logStartupDiagnostics() {
    if (hasLoggedStartupDiagnostics) {
        return
    }

    hasLoggedStartupDiagnostics = true
    const diagnostics = getConfigDiagnostics()

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

function buildRequestMeta(req) {
    return {
        method: req.method,
        path: req.url,
        requestId: req.headers['x-vercel-id'] || req.headers['x-request-id'] || ''
    }
}

async function resolveServerApp() {
    logStartupDiagnostics()

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
