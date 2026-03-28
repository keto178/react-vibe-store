import dotenv from 'dotenv'

dotenv.config()

const nodeEnv = process.env.NODE_ENV || 'development'
const isProduction = nodeEnv === 'production'

function parsePositiveInt(rawValue, fallbackValue) {
    const parsedValue = Number(rawValue)
    if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
        return fallbackValue
    }

    return Math.floor(parsedValue)
}

function parseNonNegativeInt(rawValue, fallbackValue) {
    const parsedValue = Number(rawValue)
    if (!Number.isFinite(parsedValue) || parsedValue < 0) {
        return fallbackValue
    }

    return Math.floor(parsedValue)
}

function resolveMongoUri() {
    if (process.env.MONGODB_URI) {
        return {
            value: process.env.MONGODB_URI,
            source: 'MONGODB_URI'
        }
    }

    if (process.env.DATABASE_URL) {
        return {
            value: process.env.DATABASE_URL,
            source: 'DATABASE_URL'
        }
    }

    if (process.env.MONGO_URI) {
        return {
            value: process.env.MONGO_URI,
            source: 'MONGO_URI'
        }
    }

    if (process.env.MONGODB_URL) {
        return {
            value: process.env.MONGODB_URL,
            source: 'MONGODB_URL'
        }
    }

    return {
        value: '',
        source: 'default'
    }
}

const mongoConfig = resolveMongoUri()
const mongoUriValue = mongoConfig.value || (isProduction ? '' : 'mongodb://127.0.0.1:27017/app1-ecommerce')

const env = {
    nodeEnv,
    port: Number(process.env.PORT) || 5000,
    mongoUri: mongoUriValue,
    mongoUriSource: mongoConfig.source,
    mongoServerSelectionTimeoutMs: parsePositiveInt(
        process.env.MONGO_SERVER_SELECTION_TIMEOUT_MS,
        isProduction ? 15000 : 8000
    ),
    mongoConnectTimeoutMs: parsePositiveInt(process.env.MONGO_CONNECT_TIMEOUT_MS, 15000),
    mongoSocketTimeoutMs: parsePositiveInt(process.env.MONGO_SOCKET_TIMEOUT_MS, 45000),
    mongoConnectMaxRetries: parseNonNegativeInt(process.env.MONGO_CONNECT_RETRIES, isProduction ? 2 : 1),
    mongoConnectRetryDelayMs: parsePositiveInt(process.env.MONGO_CONNECT_RETRY_DELAY_MS, 1500),
    mongoMaxPoolSize: parsePositiveInt(process.env.MONGO_MAX_POOL_SIZE, isProduction ? 10 : 5),
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
    smtpFrom: process.env.SMTP_FROM || 'Store Notifications <no-reply@example.com>',
    phoneDataSecret: process.env.PHONE_DATA_SECRET || process.env.JWT_SECRET || '',
    phoneDefaultCountryCode: process.env.PHONE_DEFAULT_COUNTRY_CODE || '+20',
    uploadMaxBytes: Number(process.env.UPLOAD_MAX_BYTES) || (10 * 1024 * 1024),
    cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
    cloudinaryApiKey: process.env.CLOUDINARY_API_KEY || '',
    cloudinaryApiSecret: process.env.CLOUDINARY_API_SECRET || '',
    cloudinaryFolder: process.env.CLOUDINARY_FOLDER || 'react-work',
    twilioAccountSid: process.env.TWILIO_ACCOUNT_SID || '',
    twilioAuthToken: process.env.TWILIO_AUTH_TOKEN || '',
    twilioFromNumber: process.env.TWILIO_FROM_NUMBER || ''
}

export function getConfigDiagnostics() {
    const missing = []
    const warnings = []

    if (!env.mongoUri) {
        missing.push('MONGODB_URI (or DATABASE_URL, MONGO_URI, MONGODB_URL)')
    }

    if (!process.env.JWT_SECRET) {
        missing.push('JWT_SECRET')
    } else if (env.jwtSecret === 'replace-this-with-a-secure-secret') {
        warnings.push('JWT_SECRET is using the default placeholder value.')
    }

    if (isProduction && !process.env.CLIENT_ORIGIN) {
        warnings.push('CLIENT_ORIGIN is not set. CORS may block custom domains.')
    }

    if (!process.env.PHONE_DATA_SECRET) {
        warnings.push('PHONE_DATA_SECRET is not set. Falling back to JWT_SECRET for phone encryption.')
    }

    if (isProduction && (!env.twilioAccountSid || !env.twilioAuthToken || !env.twilioFromNumber)) {
        warnings.push('Twilio SMS settings are incomplete. OTP delivery will use preview mode instead of SMS.')
    }

    if (isProduction && (!env.cloudinaryCloudName || !env.cloudinaryApiKey || !env.cloudinaryApiSecret)) {
        warnings.push('Cloudinary storage is not configured. Upload endpoints will reject files in production.')
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
