export function notFoundHandler(req, res) {
    res.status(404).json({
        message: `Cannot ${req.method} ${req.originalUrl}`
    })
}

function sanitizeValue(value) {
    if (Array.isArray(value)) {
        return value.map(sanitizeValue)
    }

    if (!value || typeof value !== 'object') {
        if (typeof value === 'string' && value.length > 200) {
            return `${value.slice(0, 200)}...`
        }

        return value
    }

    const sanitized = {}

    for (const [key, entry] of Object.entries(value)) {
        if (/password|token|secret|authorization|cookie/i.test(key)) {
            sanitized[key] = '[redacted]'
            continue
        }

        sanitized[key] = sanitizeValue(entry)
    }

    return sanitized
}

function buildRequestLogContext(req) {
    return {
        method: req.method,
        path: req.originalUrl,
        ip: req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '',
        userAgent: req.headers['user-agent'] || '',
        origin: req.headers.origin || '',
        params: sanitizeValue(req.params || {}),
        query: sanitizeValue(req.query || {}),
        body: sanitizeValue(req.body || {}),
        requestId: req.headers['x-vercel-id'] || req.headers['x-request-id'] || ''
    }
}

export function errorHandler(error, req, res, next) {
    if (res.headersSent) {
        next(error)
        return
    }

    const statusCode = res.statusCode >= 400 ? res.statusCode : 500
    let message = error.message || 'Something went wrong.'

    if (error.code === 11000) {
        const duplicatedField = Object.keys(error.keyPattern || {})[0] || 'value'
        message = `${duplicatedField} already exists.`
    }

    if (error.name === 'ValidationError') {
        message = Object.values(error.errors).map((item) => item.message).join(', ')
    }

    const requestContext = buildRequestLogContext(req)
    const safeMessage = statusCode >= 500
        ? 'Unable to process this request right now. Please try again.'
        : message

    console.error('[api-error]', {
        statusCode,
        message,
        errorName: error.name || 'Error',
        errorCode: error.code || '',
        stack: error.stack || '',
        ...requestContext
    })

    res.status(statusCode).json({
        message: safeMessage,
        requestId: requestContext.requestId || undefined
    })
}
