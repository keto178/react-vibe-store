import { randomUUID } from 'node:crypto'

export function sanitizeValue(value) {
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

export function getRequestId(req) {
    const forwardedRequestId = req.headers['x-request-id']
    const vercelRequestId = req.headers['x-vercel-id']

    return String(forwardedRequestId || vercelRequestId || randomUUID())
}

export function attachRequestContext(req, res, next) {
    req.requestId = getRequestId(req)
    res.setHeader('X-Request-Id', req.requestId)
    next()
}

export function buildRequestLogContext(req) {
    return {
        requestId: req.requestId || '',
        method: req.method,
        path: req.originalUrl || req.url,
        ip: req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '',
        userAgent: req.headers['user-agent'] || '',
        origin: req.headers.origin || '',
        params: sanitizeValue(req.params || {}),
        query: sanitizeValue(req.query || {}),
        body: sanitizeValue(req.body || {})
    }
}
