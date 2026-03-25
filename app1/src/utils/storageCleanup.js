import { SESSION_STORAGE_KEY } from './auth'

const LEGACY_STORAGE_KEYS = [
    'app1_signup_user',
    'app1_products',
    'app1_cart',
    'app1_categories',
    'app1_orders'
]

function removeKeys(storageObject, keys) {
    keys.forEach((key) => {
        storageObject.removeItem(key)
    })
}

function cleanupLegacySession(storageObject) {
    const savedSession = storageObject.getItem(SESSION_STORAGE_KEY)

    if (!savedSession) {
        return
    }

    try {
        const parsedSession = JSON.parse(savedSession)

        if (!parsedSession?.token || !parsedSession?.email) {
            storageObject.removeItem(SESSION_STORAGE_KEY)
        }
    } catch {
        storageObject.removeItem(SESSION_STORAGE_KEY)
    }
}

export function cleanupLegacyStorage() {
    if (typeof window === 'undefined') {
        return
    }

    removeKeys(window.localStorage, LEGACY_STORAGE_KEYS)
    removeKeys(window.sessionStorage, LEGACY_STORAGE_KEYS)
    cleanupLegacySession(window.localStorage)
}
