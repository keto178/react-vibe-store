export const SESSION_STORAGE_KEY = 'app1_active_user'
const sessionListeners = new Set()

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
        return null
    }

    try {
        const parsedSession = JSON.parse(savedSession)

        if (!parsedSession?.token || !parsedSession?.email || parsedSession?.authMode === 'fallback') {
            window.localStorage.removeItem(SESSION_STORAGE_KEY)
            return null
        }

        return parsedSession
    } catch {
        window.localStorage.removeItem(SESSION_STORAGE_KEY)
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

    window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session))
    notifySessionListeners()

    return session
}

export function clearActiveSession() {
    if (!canUseLocalStorage()) {
        return
    }

    window.localStorage.removeItem(SESSION_STORAGE_KEY)
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
