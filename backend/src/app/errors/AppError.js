export class AppError extends Error {
    constructor(statusCode, code, message, options = {}) {
        super(message)

        this.name = 'AppError'
        this.statusCode = Number.isInteger(statusCode) ? statusCode : 500
        this.code = String(code || 'INTERNAL_ERROR')
        this.expose = options.expose ?? this.statusCode < 500
        this.details = Array.isArray(options.details) ? options.details : []
        this.cause = options.cause
    }
}

export function isAppError(error) {
    return error instanceof AppError
}
