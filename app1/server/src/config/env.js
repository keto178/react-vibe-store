import dotenv from 'dotenv'

dotenv.config()

const nodeEnv = process.env.NODE_ENV || 'development'
const isProduction = nodeEnv === 'production'
const mongoUriFromEnv = process.env.MONGODB_URI || process.env.DATABASE_URL || ''

const env = {
    nodeEnv,
    port: Number(process.env.PORT) || 5000,
    mongoUri: mongoUriFromEnv || (isProduction ? '' : 'mongodb://127.0.0.1:27017/app1-ecommerce'),
    mongoUriSource: process.env.MONGODB_URI
        ? 'MONGODB_URI'
        : (process.env.DATABASE_URL ? 'DATABASE_URL' : 'default'),
    jwtSecret: process.env.JWT_SECRET || 'replace-this-with-a-secure-secret',
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
    clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
    adminUsername: process.env.ADMIN_USERNAME || 'store-admin',
    adminEmail: process.env.ADMIN_EMAIL || 'admin@example.com',
    adminPassword: process.env.ADMIN_PASSWORD || 'Admin@12345',
    adminNotificationEmail: process.env.ADMIN_NOTIFICATION_EMAIL || process.env.ADMIN_EMAIL || '',
    smtpHost: process.env.SMTP_HOST || '',
    smtpPort: Number(process.env.SMTP_PORT) || 587,
    smtpSecure: process.env.SMTP_SECURE === 'true',
    smtpUser: process.env.SMTP_USER || '',
    smtpPass: process.env.SMTP_PASS || '',
    smtpFrom: process.env.SMTP_FROM || 'Store Notifications <no-reply@example.com>'
}

export function getConfigDiagnostics() {
    const missing = []
    const warnings = []

    if (!env.mongoUri) {
        missing.push('MONGODB_URI (or DATABASE_URL)')
    }

    if (!process.env.JWT_SECRET) {
        missing.push('JWT_SECRET')
    } else if (env.jwtSecret === 'replace-this-with-a-secure-secret') {
        warnings.push('JWT_SECRET is using the default placeholder value.')
    }

    if (isProduction && !process.env.CLIENT_ORIGIN) {
        warnings.push('CLIENT_ORIGIN is not set. CORS may block custom domains.')
    }

    return {
        nodeEnv: env.nodeEnv,
        mongoUriSource: env.mongoUriSource,
        hasMongoUri: Boolean(env.mongoUri),
        missing,
        warnings
    }
}

export default env
