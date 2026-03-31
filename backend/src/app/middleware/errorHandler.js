import { AppError, isAppError } from '../errors/AppError.js'
import { buildRequestLogContext } from './requestContext.js'

function mapMongoError(error) {
    if (isAppError(error)) {
        return error
    }

    if (error?.type === 'entity.parse.failed') {
        return new AppError(400, 'INVALID_JSON_BODY', 'Request body must be valid JSON.')
    }

    if (error?.name === 'CastError') {
        return new AppError(400, 'INVALID_IDENTIFIER', 'The requested resource identifier is invalid.')
    }

    if (error?.code === 11000) {
        const duplicatedField = Object.keys(error.keyPattern || {})[0] || 'value'
        return new AppError(409, 'DUPLICATE_VALUE', `${duplicatedField} already exists.`)
    }

    if (error?.name === 'ValidationError') {
        return new AppError(
            400,
            'VALIDATION_ERROR',
            Object.values(error.errors || {})
                .map((entry) => entry.message)
                .filter(Boolean)
                .join(', ') || 'Validation failed.'
        )
    }

    return new AppError(500, error?.code || 'INTERNAL_ERROR', error?.message || 'Something went wrong.', {
        cause: error,
        expose: false
    })
}

export function notFoundHandler(req, res) {
    res.status(404).json({
        message: `Cannot ${req.method} ${req.originalUrl}`,
        code: 'ROUTE_NOT_FOUND',
        requestId: req.requestId || undefined
    })
}

export function errorHandler(error, req, res, next) {
    if (res.headersSent) {
        next(error)
        return
    }

    const normalizedError = mapMongoError(error)
    const requestContext = buildRequestLogContext(req)

    console.error('[api-error]', {
        ...requestContext,
        statusCode: normalizedError.statusCode,
        code: normalizedError.code,
        message: normalizedError.message,
        details: normalizedError.details,
        stack: error?.stack || normalizedError.stack || ''
    })

    res.status(normalizedError.statusCode).json({
        message: normalizedError.expose
            ? normalizedError.message
            : 'Unable to process this request right now. Please try again.',
        code: normalizedError.code,
        requestId: req.requestId || undefined,
        ...(normalizedError.expose && normalizedError.details.length > 0
            ? { details: normalizedError.details }
            : {})
    })
}
