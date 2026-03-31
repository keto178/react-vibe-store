import mongoose from 'mongoose'
import env from '../../config/env.js'
import { AppError } from '../../app/errors/AppError.js'

let activeConnectionPromise = null

function sleep(milliseconds) {
    return new Promise((resolve) => {
        setTimeout(resolve, milliseconds)
    })
}

function getReadyStateName(state) {
    switch (state) {
    case 0:
        return 'disconnected'
    case 1:
        return 'connected'
    case 2:
        return 'connecting'
    case 3:
        return 'disconnecting'
    default:
        return 'unknown'
    }
}

export function getDatabaseDebugState() {
    return {
        readyState: mongoose.connection.readyState,
        readyStateName: getReadyStateName(mongoose.connection.readyState),
        host: mongoose.connection.host || '',
        name: mongoose.connection.name || ''
    }
}

async function disconnectQuietly() {
    if (mongoose.connection.readyState === 0) {
        return
    }

    try {
        await mongoose.disconnect()
    } catch {
        // Ignore disconnect failures while preparing a retry.
    }
}

async function connectWithRetry() {
    const totalAttempts = env.mongoConnectMaxRetries + 1
    let attempt = 0
    let lastError = null

    while (attempt < totalAttempts) {
        attempt += 1

        try {
            await mongoose.connect(env.mongoUri, {
                serverSelectionTimeoutMS: env.mongoServerSelectionTimeoutMs,
                connectTimeoutMS: env.mongoConnectTimeoutMs,
                socketTimeoutMS: env.mongoSocketTimeoutMs,
                maxPoolSize: env.mongoMaxPoolSize
            })

            if (attempt > 1) {
                console.info('[db] MongoDB connection recovered after retry.', {
                    attempt,
                    totalAttempts
                })
            }

            return mongoose.connection
        } catch (error) {
            lastError = error

            console.error('[db] MongoDB connection attempt failed.', {
                attempt,
                totalAttempts,
                errorMessage: error.message
            })

            if (attempt >= totalAttempts) {
                break
            }

            await disconnectQuietly()
            await sleep(env.mongoConnectRetryDelayMs * attempt)
        }
    }

    throw new AppError(
        503,
        'DATABASE_UNAVAILABLE',
        `Could not connect to MongoDB after ${totalAttempts} attempt${totalAttempts > 1 ? 's' : ''}.`,
        {
            expose: false,
            details: lastError?.message ? [lastError.message] : [],
            cause: lastError
        }
    )
}

export async function connectToDatabase() {
    mongoose.set('strictQuery', true)

    if (!env.mongoUri) {
        throw new AppError(500, 'DATABASE_CONFIG_MISSING', 'MongoDB URI is not configured.', {
            expose: true,
            details: ['Set MONGODB_URI before starting the server.']
        })
    }

    if (mongoose.connection.readyState === 1) {
        return mongoose.connection
    }

    if (activeConnectionPromise) {
        await activeConnectionPromise
        return mongoose.connection
    }

    activeConnectionPromise = connectWithRetry().finally(() => {
        activeConnectionPromise = null
    })

    await activeConnectionPromise
    return mongoose.connection
}

export async function runInTransaction(work) {
    const session = await mongoose.startSession()

    try {
        let result

        await session.withTransaction(async () => {
            result = await work(session)
        })

        return result
    } finally {
        await session.endSession()
    }
}
