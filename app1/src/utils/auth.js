export const SESSION_STORAGE_KEY = 'app1_active_user'

export function normalizeUsername(username) {
    return username?.trim().toLowerCase() || ''
}

export function getActiveSession() {
    const savedSession = localStorage.getItem(SESSION_STORAGE_KEY)

    if (!savedSession) {
        return null
    }

    try {
        const parsedSession = JSON.parse(savedSession)

        if (!parsedSession?.token || !parsedSession?.email) {
            localStorage.removeItem(SESSION_STORAGE_KEY)
            return null
        }

        return parsedSession
    } catch {
        localStorage.removeItem(SESSION_STORAGE_KEY)
        return null
    }
}

export function getAuthToken() {
    return getActiveSession()?.token || ''
}

export function saveActiveSession(authPayload) {
    const user = authPayload?.user || authPayload

    const session = {
        id: user.id,
        username: normalizeUsername(user.username),
        email: user.email,
        role: user.role || 'user',
        token: authPayload?.token || user.token || '',
        authMode: authPayload?.authMode || user.authMode || 'api'
    }

    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session))
}

export function clearActiveSession() {
    localStorage.removeItem(SESSION_STORAGE_KEY)
}

export function isDashboardOwner(user) {
    return user?.role === 'admin'
}
