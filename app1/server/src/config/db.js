import mongoose from 'mongoose'
import env from './env.js'

let activeConnectionPromise = null

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

export async function connectToDatabase() {
    mongoose.set('strictQuery', true)

    if (!env.mongoUri) {
        throw new Error('MongoDB URI is not configured. Set MONGODB_URI or DATABASE_URL.')
    }

    if (mongoose.connection.readyState === 1) {
        return mongoose.connection
    }

    if (activeConnectionPromise) {
        await activeConnectionPromise
        return mongoose.connection
    }

    activeConnectionPromise = mongoose.connect(env.mongoUri, {
        serverSelectionTimeoutMS: 5000
    }).finally(() => {
        activeConnectionPromise = null
    })

    await activeConnectionPromise
    return mongoose.connection
}
