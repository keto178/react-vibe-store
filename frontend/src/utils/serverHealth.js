export const DEFAULT_SERVER_HEALTH = Object.freeze({
    status: 'unknown',
    apiMode: 'unknown',
    persistence: 'unknown',
    catalogSource: 'unknown',
    writeAccess: true,
    fileStorage: 'unknown',
    message: '',
    setupHint: '',
    warnings: []
})

function joinHealthTextParts(parts) {
    return parts
        .filter((part) => typeof part === 'string' && part.trim())
        .join(' ')
}

export function normalizeServerHealth(payload) {
    return {
        status: typeof payload?.status === 'string' ? payload.status : DEFAULT_SERVER_HEALTH.status,
        apiMode: typeof payload?.apiMode === 'string'
            ? payload.apiMode
            : (typeof payload?.storage === 'string' ? payload.storage : DEFAULT_SERVER_HEALTH.apiMode),
        persistence: typeof payload?.persistence === 'string' ? payload.persistence : DEFAULT_SERVER_HEALTH.persistence,
        catalogSource: typeof payload?.catalogSource === 'string' ? payload.catalogSource : DEFAULT_SERVER_HEALTH.catalogSource,
        writeAccess: payload?.writeAccess !== false,
        fileStorage: typeof payload?.fileStorage === 'string' ? payload.fileStorage : DEFAULT_SERVER_HEALTH.fileStorage,
        message: typeof payload?.message === 'string' ? payload.message : DEFAULT_SERVER_HEALTH.message,
        setupHint: typeof payload?.setupHint === 'string' ? payload.setupHint : DEFAULT_SERVER_HEALTH.setupHint,
        warnings: Array.isArray(payload?.warnings)
            ? payload.warnings.filter((warning) => typeof warning === 'string' && warning.trim())
            : []
    }
}

export function getWriteAccessMessage(serverHealth) {
    if (serverHealth?.writeAccess === false) {
        return joinHealthTextParts([
            serverHealth.message,
            serverHealth.setupHint
        ]) || 'Saving is currently disabled because the server is running in temporary mode.'
    }

    return ''
}

export function shouldShowServerStatusBanner(serverHealth) {
    return Boolean(serverHealth?.message) && serverHealth?.persistence !== 'persistent'
}
