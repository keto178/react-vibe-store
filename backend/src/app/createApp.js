import cors from 'cors'
import express from 'express'
import env from '../config/env.js'
import { AppError } from './errors/AppError.js'
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js'
import { attachRequestContext } from './middleware/requestContext.js'
import { registerRoutes } from './routes/index.js'

function isAllowedDevOrigin(origin) {
    return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin)
}

function isAllowedVercelOrigin(origin) {
    return /^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(origin)
}

const app = express()

app.disable('x-powered-by')
app.use(attachRequestContext)
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff')
    next()
})
app.use(cors({
    origin(origin, callback) {
        if (!origin || origin === env.clientOrigin) {
            callback(null, true)
            return
        }

        if (!env.isProduction && isAllowedDevOrigin(origin)) {
            callback(null, true)
            return
        }

        if (isAllowedVercelOrigin(origin)) {
            callback(null, true)
            return
        }

        callback(new AppError(403, 'CORS_ORIGIN_BLOCKED', `Origin ${origin} is not allowed by CORS.`))
    }
}))
app.use(express.json({ limit: env.uploadMaxBytes }))
app.use(express.urlencoded({ extended: true, limit: env.uploadMaxBytes }))
app.use('/api', (req, res, next) => {
    res.set('Cache-Control', 'no-store')
    next()
})

registerRoutes(app)

app.use(notFoundHandler)
app.use(errorHandler)

export default app
