import cors from 'cors'
import express from 'express'
import env from './config/env.js'
import { asyncHandler } from './middleware/asyncHandler.js'
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js'
import { buildMongoRuntimeHealth } from './services/runtimeHealth.js'
import { isBlobAssetStorageAvailable, readBlobAsset } from './services/vercelBlobService.js'
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
    res.json(buildMongoRuntimeHealth())
})

app.get('/api/assets/blob', asyncHandler(async (req, res) => {
    const pathname = String(req.query?.pathname || '').trim()

    if (!pathname) {
        res.status(400)
        throw new Error('Blob asset pathname is required.')
    }

    if (!isBlobAssetStorageAvailable()) {
        res.status(503)
        throw new Error('Blob asset storage is not configured for this deployment.')
    }

    const assetResult = await readBlobAsset(pathname)

    if (!assetResult?.stream || assetResult.statusCode !== 200) {
        res.status(404)
        throw new Error('Blob asset not found.')
    }

    const assetBuffer = Buffer.from(await new Response(assetResult.stream).arrayBuffer())

    res.set('Cache-Control', assetResult.blob.cacheControl || 'public, max-age=31536000, immutable')
    res.set('Content-Disposition', assetResult.blob.contentDisposition || 'inline')
    res.type(assetResult.blob.contentType || 'application/octet-stream')
    res.send(assetBuffer)
}))

app.use('/api/auth', authRoutes)
app.use('/api/categories', categoryRoutes)
app.use('/api/products', productRoutes)
app.use('/api/cart', cartRoutes)
app.use('/api/orders', orderRoutes)
app.use('/api/uploads', uploadRoutes)

app.use(notFoundHandler)
app.use(errorHandler)

export default app
