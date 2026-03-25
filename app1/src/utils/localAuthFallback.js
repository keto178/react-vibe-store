const LOCAL_USERS_STORAGE_KEY = 'app1_local_fallback_users'

const DEV_ADMIN_USER = {
    id: 'local-admin',
    username: 'store-admin',
    email: 'admin@example.com',
    role: 'admin'
}

const DEV_ADMIN_PASSWORD = 'Admin@12345'

function readFallbackUsers() {
    if (typeof window === 'undefined') {
        return []
    }

    const rawValue = window.localStorage.getItem(LOCAL_USERS_STORAGE_KEY)

    if (!rawValue) {
        return []
    }

    try {
        const parsedUsers = JSON.parse(rawValue)
        return Array.isArray(parsedUsers) ? parsedUsers : []
    } catch {
        window.localStorage.removeItem(LOCAL_USERS_STORAGE_KEY)
        return []
    }
}

function writeFallbackUsers(users) {
    if (typeof window === 'undefined') {
        return
    }

    window.localStorage.setItem(LOCAL_USERS_STORAGE_KEY, JSON.stringify(users))
}

function buildFallbackAuthResponse(user) {
    return {
        message: 'Logged in using local fallback mode.',
        token: `fallback-token-${user.id}`,
        authMode: 'fallback',
        user
    }
}

export function isApiReachabilityError(error) {
    return error?.message?.includes('Cannot reach the API server')
}

export function loginWithFallbackAuth({ email, password }) {
    const normalizedEmail = email?.trim().toLowerCase()

    if (normalizedEmail === DEV_ADMIN_USER.email && password === DEV_ADMIN_PASSWORD) {
        return buildFallbackAuthResponse(DEV_ADMIN_USER)
    }

    const localUser = readFallbackUsers().find((user) => user.email === normalizedEmail)

    if (!localUser || localUser.password !== password) {
        throw new Error('Incorrect email or password.')
    }

    return buildFallbackAuthResponse({
        id: localUser.id,
        username: localUser.username,
        email: localUser.email,
        role: localUser.role || 'user'
    })
}

export function registerWithFallbackAuth({ username, email, password }) {
    const normalizedUsername = username?.trim().toLowerCase()
    const normalizedEmail = email?.trim().toLowerCase()
    const users = readFallbackUsers()

    const alreadyExists = normalizedEmail === DEV_ADMIN_USER.email ||
        users.some((user) => user.email === normalizedEmail || user.username === normalizedUsername)

    if (alreadyExists) {
        throw new Error('A user with this email or username already exists.')
    }

    const user = {
        id: `local-user-${Date.now()}`,
        username: normalizedUsername,
        email: normalizedEmail,
        password,
        role: 'user'
    }

    writeFallbackUsers([...users, user])

    return buildFallbackAuthResponse({
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
    })
}
