import env from '../config/env.js'

function createTimestamp() {
    return new Date().toISOString()
}

function buildDatabaseSnapshot(database = {}) {
    return {
        configured: Boolean(env.mongoUri),
        readyState: Number(database?.readyState) || 0,
        readyStateName: String(database?.readyStateName || '').trim() || 'disconnected',
        host: String(database?.host || '').trim(),
        name: String(database?.name || '').trim()
    }
}

function getFailureReason(code = '') {
    switch (String(code || '').trim()) {
    case 'DATABASE_CONFIG_MISSING':
        return 'mongodb_config_missing'
    case 'DATABASE_UNAVAILABLE':
        return 'mongodb_connection_failed'
    default:
        return 'mongodb_bootstrap_failed'
    }
}

function summarizeError(error) {
    return {
        code: String(error?.code || 'API_STARTUP_FAILED'),
        reason: getFailureReason(error?.code),
        message: String(error?.message || 'The backend could not start correctly.'),
        details: Array.isArray(error?.details)
            ? error.details.filter((detail) => typeof detail === 'string' && detail.trim())
            : []
    }
}

function cloneState(state) {
    return JSON.parse(JSON.stringify(state))
}

const runtimeState = {
    primaryBackend: 'mongodb',
    activeBackend: 'unknown',
    activeBackendSince: null,
    fallbackActive: false,
    fallbackBackend: '',
    fallbackRetryAt: null,
    fallbackReason: '',
    fallbackCode: '',
    fallbackMessage: '',
    fallbackDetails: [],
    lastMongoAttemptAt: null,
    lastMongoConnectedAt: null,
    lastMongoFailureAt: null,
    lastMongoFailure: null,
    database: buildDatabaseSnapshot(),
    bootstrap: {
        adminBootstrap: {
            status: 'pending',
            userId: '',
            email: ''
        },
        catalogSeed: {
            status: 'pending',
            categoriesSeeded: 0,
            productsSeeded: 0
        }
    }
}

export function getRuntimeBackendState() {
    return cloneState(runtimeState)
}

export function recordMongoBootstrapAttempt({ database } = {}) {
    runtimeState.lastMongoAttemptAt = createTimestamp()
    runtimeState.database = buildDatabaseSnapshot(database)
}

export function recordMongoBootstrapFailure({ error, database } = {}) {
    runtimeState.lastMongoFailureAt = createTimestamp()
    runtimeState.lastMongoFailure = summarizeError(error)
    runtimeState.database = buildDatabaseSnapshot(database)
}

export function recordMongoBackendReady({ database, bootstrap } = {}) {
    const previousBackend = runtimeState.activeBackend
    const timestamp = createTimestamp()

    runtimeState.activeBackend = 'mongodb'
    runtimeState.activeBackendSince = timestamp
    runtimeState.fallbackActive = false
    runtimeState.fallbackBackend = ''
    runtimeState.fallbackRetryAt = null
    runtimeState.fallbackReason = ''
    runtimeState.fallbackCode = ''
    runtimeState.fallbackMessage = ''
    runtimeState.fallbackDetails = []
    runtimeState.lastMongoConnectedAt = timestamp
    runtimeState.database = buildDatabaseSnapshot(database)

    if (bootstrap?.adminBootstrap) {
        runtimeState.bootstrap.adminBootstrap = bootstrap.adminBootstrap
    }

    if (bootstrap?.catalogSeed) {
        runtimeState.bootstrap.catalogSeed = bootstrap.catalogSeed
    }

    if (previousBackend !== 'mongodb') {
        console.info('[runtime] Primary MongoDB backend is active.', {
            database: runtimeState.database,
            adminBootstrap: runtimeState.bootstrap.adminBootstrap,
            catalogSeed: runtimeState.bootstrap.catalogSeed
        })
    }
}

export function recordFallbackBackendActivation({ error, database, fallbackBackend, retryAt } = {}) {
    const nextFailure = summarizeError(error)
    const nextBackend = String(fallbackBackend || 'fallback').trim() || 'fallback'
    const previousState = {
        activeBackend: runtimeState.activeBackend,
        fallbackBackend: runtimeState.fallbackBackend,
        fallbackCode: runtimeState.fallbackCode
    }

    runtimeState.activeBackend = nextBackend
    runtimeState.activeBackendSince = createTimestamp()
    runtimeState.fallbackActive = true
    runtimeState.fallbackBackend = nextBackend
    runtimeState.fallbackRetryAt = retryAt || null
    runtimeState.fallbackReason = nextFailure.reason
    runtimeState.fallbackCode = nextFailure.code
    runtimeState.fallbackMessage = nextFailure.message
    runtimeState.fallbackDetails = nextFailure.details
    runtimeState.lastMongoFailureAt = runtimeState.activeBackendSince
    runtimeState.lastMongoFailure = nextFailure
    runtimeState.database = buildDatabaseSnapshot(database)

    const shouldLogTransition = (
        previousState.activeBackend !== nextBackend ||
        previousState.fallbackBackend !== nextBackend ||
        previousState.fallbackCode !== nextFailure.code
    )

    if (shouldLogTransition) {
        console.warn('[runtime] MongoDB is unavailable. Falling back to secondary persistence.', {
            fallbackBackend: nextBackend,
            retryAt: runtimeState.fallbackRetryAt,
            failure: nextFailure,
            database: runtimeState.database
        })
    }
}

export function shouldAttemptMongoBootstrap(now = Date.now()) {
    if (!runtimeState.fallbackActive) {
        return true
    }

    if (!runtimeState.fallbackRetryAt) {
        return true
    }

    const retryAt = Date.parse(runtimeState.fallbackRetryAt)

    if (Number.isNaN(retryAt)) {
        return true
    }

    return now >= retryAt
}
