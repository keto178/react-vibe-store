export function notFoundHandler(req, res) {
    res.status(404).json({
        message: `Cannot ${req.method} ${req.originalUrl}`
    })
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

    res.status(statusCode).json({
        message
    })
}
