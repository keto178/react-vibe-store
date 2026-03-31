import { getLegacyBlobAsset } from '../controllers/assetController.js'
import { getHealth } from '../controllers/healthController.js'
import authRoutes from './authRoutes.js'
import cartRoutes from './cartRoutes.js'
import categoryRoutes from './categoryRoutes.js'
import orderRoutes from './orderRoutes.js'
import productRoutes from './productRoutes.js'
import uploadRoutes from './uploadRoutes.js'

export function registerRoutes(app) {
    app.get('/api/health', getHealth)
    app.get('/api/assets/blob', getLegacyBlobAsset)
    app.use('/api/auth', authRoutes)
    app.use('/api/categories', categoryRoutes)
    app.use('/api/products', productRoutes)
    app.use('/api/cart', cartRoutes)
    app.use('/api/orders', orderRoutes)
    app.use('/api/uploads', uploadRoutes)
}
