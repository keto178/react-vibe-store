import cors from 'cors'
import express from 'express'
import env from './config/env.js'
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js'
import { getExternalStorageMode } from './services/externalStorageService.js'
import authRoutes from './routes/authRoutes.js'
import cartRoutes from './routes/cartRoutes.js'
import categoryRoutes from './routes/categoryRoutes.js'
import orderRoutes from './routes/orderRoutes.js'
import productRoutes from './routes/productRoutes.js'
import uploadRoutes from './routes/uploadRoutes.js'

const app = express()

function isAllowedDevOrigin(origin) {
    return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin)
}

function isAllowedVercelOrigin(origin) {
    return /^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(origin)
}

app.use(cors({
    origin(origin, callback) {
        if (!origin || origin === env.clientOrigin) {
            callback(null, true)
            return
        }

        if (env.nodeEnv !== 'production' && isAllowedDevOrigin(origin)) {
            callback(null, true)
            return
        }

        if (isAllowedVercelOrigin(origin)) {
            callback(null, true)
            return
        }

        callback(new Error(`Origin ${origin} is not allowed by CORS.`))
    }
}))
app.use(express.json({ limit: '15mb' }))
app.use(express.urlencoded({ extended: true, limit: '15mb' }))
app.use('/api', (req, res, next) => {
    res.set('Cache-Control', 'no-store')
    next()
})

app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        fileStorage: getExternalStorageMode()
    })
})

app.use('/api/auth', authRoutes)
app.use('/api/categories', categoryRoutes)
app.use('/api/products', productRoutes)
app.use('/api/cart', cartRoutes)
app.use('/api/orders', orderRoutes)
app.use('/api/uploads', uploadRoutes)

app.use(notFoundHandler)
app.use(errorHandler)

export default app
