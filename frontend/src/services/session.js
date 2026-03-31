export const SESSION_STORAGE_KEY = 'app1_active_user'
const sessionListeners = new Set()
let cachedSessionRaw = null
let cachedSessionValue = null

export function normalizeUsername(username) {
    return username?.trim().toLowerCase() || ''
}

function canUseLocalStorage() {
    return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

function notifySessionListeners() {
    sessionListeners.forEach((listener) => listener())
}

function buildSession(authPayload) {
    const user = authPayload?.user || authPayload

    return {
        id: user?.id || '',
        username: normalizeUsername(user?.username),
        email: user?.email?.trim().toLowerCase() || '',
        role: user?.role || 'user',
        phoneMasked: user?.phoneMasked || '',
        isPhoneVerified: Boolean(user?.isPhoneVerified),
        requiresPhoneVerification: Boolean(user?.requiresPhoneVerification),
        token: authPayload?.token || user?.token || '',
        authMode: authPayload?.authMode || user?.authMode || 'api'
    }
}

export function getActiveSession() {
    if (!canUseLocalStorage()) {
        return null
    }

    const savedSession = window.localStorage.getItem(SESSION_STORAGE_KEY)

    if (!savedSession) {
        cachedSessionRaw = null
        cachedSessionValue = null
        return null
    }

    if (savedSession === cachedSessionRaw) {
        return cachedSessionValue
    }

    try {
        const parsedSession = JSON.parse(savedSession)

        if (!parsedSession?.token || !parsedSession?.email) {
            window.localStorage.removeItem(SESSION_STORAGE_KEY)
            cachedSessionRaw = null
            cachedSessionValue = null
            return null
        }

        cachedSessionRaw = savedSession
        cachedSessionValue = parsedSession

        return cachedSessionValue
    } catch {
        window.localStorage.removeItem(SESSION_STORAGE_KEY)
        cachedSessionRaw = null
        cachedSessionValue = null
        return null
    }
}

export function getAuthToken() {
    return getActiveSession()?.token || ''
}

export function saveActiveSession(authPayload) {
    if (!canUseLocalStorage()) {
        return null
    }

    const session = buildSession(authPayload)

    if (!session.token || !session.email) {
        clearActiveSession()
        return null
    }

    const serializedSession = JSON.stringify(session)

    window.localStorage.setItem(SESSION_STORAGE_KEY, serializedSession)
    cachedSessionRaw = serializedSession
    cachedSessionValue = session
    notifySessionListeners()

    return session
}

export function clearActiveSession() {
    if (!canUseLocalStorage()) {
        return
    }

    window.localStorage.removeItem(SESSION_STORAGE_KEY)
    cachedSessionRaw = null
    cachedSessionValue = null
    notifySessionListeners()
}

export function subscribeToActiveSession(listener) {
    sessionListeners.add(listener)

    return () => {
        sessionListeners.delete(listener)
    }
}

export function isDashboardOwner(user) {
    return user?.role === 'admin'
}
