import dotenv from 'dotenv'
import { AppError } from '../app/errors/AppError.js'

dotenv.config()

const PLACEHOLDER_JWT_SECRET = 'replace-this-with-a-secure-secret'
const PLACEHOLDER_ADMIN_PASSWORD = 'Admin@12345'
const VALID_NODE_ENVS = new Set(['development', 'test', 'production'])

function normalizeString(value) {
    return String(value || '').trim()
}

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

function parseBoolean(value) {
    return ['1', 'true', 'yes', 'on'].includes(String(value || '').trim().toLowerCase())
}

const configuredNodeEnv = normalizeString(process.env.NODE_ENV)
const nodeEnv = configuredNodeEnv || 'development'
const isProduction = nodeEnv === 'production'

const env = {
    nodeEnv,
    nodeEnvExplicit: Boolean(configuredNodeEnv),
    isProduction,
    port: Number(process.env.PORT) || 5000,
    mongoUri: normalizeString(process.env.MONGODB_URI),
    mongoServerSelectionTimeoutMs: parsePositiveInt(process.env.MONGO_SERVER_SELECTION_TIMEOUT_MS, isProduction ? 15000 : 8000),
    mongoConnectTimeoutMs: parsePositiveInt(process.env.MONGO_CONNECT_TIMEOUT_MS, 15000),
    mongoSocketTimeoutMs: parsePositiveInt(process.env.MONGO_SOCKET_TIMEOUT_MS, 45000),
    mongoConnectMaxRetries: parseNonNegativeInt(process.env.MONGO_CONNECT_RETRIES, isProduction ? 2 : 1),
    mongoConnectRetryDelayMs: parsePositiveInt(process.env.MONGO_CONNECT_RETRY_DELAY_MS, 1500),
    mongoMaxPoolSize: parsePositiveInt(process.env.MONGO_MAX_POOL_SIZE, isProduction ? 10 : 5),
    jwtSecret: normalizeString(process.env.JWT_SECRET) || PLACEHOLDER_JWT_SECRET,
    jwtExpiresIn: normalizeString(process.env.JWT_EXPIRES_IN) || '7d',
    clientOrigin: normalizeString(process.env.CLIENT_ORIGIN) || (isProduction ? '' : 'http://localhost:5173'),
    storageProvider: normalizeString(process.env.STORAGE_PROVIDER).toLowerCase(),
    enableDevMockStorage: parseBoolean(process.env.ENABLE_DEV_MOCK_STORAGE),
    allowLegacyDataUrlUploads: process.env.ALLOW_LEGACY_DATA_URL_UPLOADS === undefined
        ? !isProduction
        : parseBoolean(process.env.ALLOW_LEGACY_DATA_URL_UPLOADS),
    uploadMaxBytes: Number(process.env.UPLOAD_MAX_BYTES) || (10 * 1024 * 1024),
    cloudinaryCloudName: normalizeString(process.env.CLOUDINARY_CLOUD_NAME),
    cloudinaryApiKey: normalizeString(process.env.CLOUDINARY_API_KEY),
    cloudinaryApiSecret: normalizeString(process.env.CLOUDINARY_API_SECRET),
    cloudinaryFolder: normalizeString(process.env.CLOUDINARY_FOLDER) || 'react-work',
    blobReadWriteToken: normalizeString(process.env.BLOB_READ_WRITE_TOKEN),
    adminUsername: normalizeString(process.env.ADMIN_USERNAME) || 'store-admin',
    adminEmail: normalizeString(process.env.ADMIN_EMAIL) || 'admin@example.com',
    adminPassword: process.env.ADMIN_PASSWORD || PLACEHOLDER_ADMIN_PASSWORD,
    adminNotificationEmail: normalizeString(process.env.ADMIN_NOTIFICATION_EMAIL) || normalizeString(process.env.ADMIN_EMAIL),
    smtpHost: normalizeString(process.env.SMTP_HOST),
    smtpPort: Number(process.env.SMTP_PORT) || 587,
    smtpSecure: parseBoolean(process.env.SMTP_SECURE),
    smtpUser: normalizeString(process.env.SMTP_USER),
    smtpPass: normalizeString(process.env.SMTP_PASS),
    smtpFrom: normalizeString(process.env.SMTP_FROM) || 'Store Notifications <no-reply@example.com>',
    hasDedicatedPhoneDataSecret: Boolean(normalizeString(process.env.PHONE_DATA_SECRET)),
    phoneDataSecret: normalizeString(process.env.PHONE_DATA_SECRET) || normalizeString(process.env.JWT_SECRET),
    phoneDefaultCountryCode: normalizeString(process.env.PHONE_DEFAULT_COUNTRY_CODE) || '+20',
    twilioAccountSid: normalizeString(process.env.TWILIO_ACCOUNT_SID),
    twilioAuthToken: normalizeString(process.env.TWILIO_AUTH_TOKEN),
    twilioFromNumber: normalizeString(process.env.TWILIO_FROM_NUMBER)
}

let validatedEnv = null

export function validateEnvironment() {
    if (validatedEnv) {
        return validatedEnv
    }

    const errors = []

    if (!VALID_NODE_ENVS.has(env.nodeEnv)) {
        errors.push('NODE_ENV must be one of: development, test, production.')
    }

    if (!env.nodeEnvExplicit && process.env.VERCEL === '1') {
        errors.push('NODE_ENV must be set explicitly on Vercel deployments.')
    }

    if (!env.mongoUri) {
        errors.push('MONGODB_URI is required.')
    }

    if (!env.jwtSecret || env.jwtSecret === PLACEHOLDER_JWT_SECRET) {
        errors.push('JWT_SECRET must be set to a non-placeholder value.')
    } else if (env.isProduction && env.jwtSecret.length < 32) {
        errors.push('JWT_SECRET must be at least 32 characters in production.')
    }

    if (!env.clientOrigin) {
        errors.push('CLIENT_ORIGIN is required.')
    }

    if (!env.storageProvider) {
        errors.push('STORAGE_PROVIDER is required.')
    }

    if (env.storageProvider === 'mock') {
        if (env.isProduction) {
            errors.push('STORAGE_PROVIDER=mock is not allowed in production.')
        }

        if (!env.enableDevMockStorage) {
            errors.push('STORAGE_PROVIDER=mock requires ENABLE_DEV_MOCK_STORAGE=true in development.')
        }
    }

    if (!['cloudinary', 'vercel-blob', 'mock'].includes(env.storageProvider)) {
        errors.push('STORAGE_PROVIDER must be one of: cloudinary, vercel-blob, mock.')
    }

    if (env.storageProvider === 'cloudinary') {
        if (!env.cloudinaryCloudName) {
            errors.push('CLOUDINARY_CLOUD_NAME is required when STORAGE_PROVIDER=cloudinary.')
        }

        if (!env.cloudinaryApiKey) {
            errors.push('CLOUDINARY_API_KEY is required when STORAGE_PROVIDER=cloudinary.')
        }

        if (!env.cloudinaryApiSecret) {
            errors.push('CLOUDINARY_API_SECRET is required when STORAGE_PROVIDER=cloudinary.')
        }
    }

    if (env.storageProvider === 'vercel-blob' && !env.blobReadWriteToken) {
        errors.push('BLOB_READ_WRITE_TOKEN is required when STORAGE_PROVIDER=vercel-blob.')
    }

    if (!env.phoneDataSecret) {
        errors.push('PHONE_DATA_SECRET is required.')
    } else if (env.isProduction && !env.hasDedicatedPhoneDataSecret) {
        errors.push('PHONE_DATA_SECRET must be set explicitly in production.')
    }

    if (!env.adminUsername) {
        errors.push('ADMIN_USERNAME is required.')
    }

    if (!env.adminEmail) {
        errors.push('ADMIN_EMAIL is required.')
    }

    if (!env.adminPassword) {
        errors.push('ADMIN_PASSWORD is required.')
    } else if (env.isProduction && (env.adminPassword === PLACEHOLDER_ADMIN_PASSWORD || env.adminPassword.length < 12)) {
        errors.push('ADMIN_PASSWORD must be at least 12 characters and must not use the default placeholder in production.')
    }

    if (env.isProduction) {
        if (!env.twilioAccountSid) {
            errors.push('TWILIO_ACCOUNT_SID is required in production.')
        }

        if (!env.twilioAuthToken) {
            errors.push('TWILIO_AUTH_TOKEN is required in production.')
        }

        if (!env.twilioFromNumber) {
            errors.push('TWILIO_FROM_NUMBER is required in production.')
        }
    }

    if (errors.length > 0) {
        throw new AppError(500, 'ENV_VALIDATION_FAILED', 'Server environment validation failed.', {
            expose: true,
            details: errors
        })
    }

    validatedEnv = Object.freeze(env)
    return validatedEnv
}

export default env
