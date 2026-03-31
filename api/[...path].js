import app from '../backend/src/app.js'
import { bootstrapApplication } from '../backend/src/app/bootstrap.js'

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

    if (error?.code === 'DATABASE_UNAVAILABLE') {
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

export default async function handler(req, res) {
    try {
        await bootstrapApplication()
        return app(req, res)
    } catch (error) {
        console.error('[api/request] Request failed before response was sent.', {
            method: req.method,
            path: req.url,
            requestId: req.headers['x-vercel-id'] || req.headers['x-request-id'] || '',
            errorMessage: error.message,
            code: error.code || '',
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
