import { useSyncExternalStore } from 'react'
import {
    getActiveSession,
    SESSION_STORAGE_KEY,
    subscribeToActiveSession
} from '../utils/auth'

function subscribe(listener) {
    const unsubscribe = subscribeToActiveSession(listener)

    if (typeof window === 'undefined') {
        return unsubscribe
    }

    const handleStorage = (event) => {
        if (!event.key || event.key === SESSION_STORAGE_KEY) {
            listener()
        }
    }

    window.addEventListener('storage', handleStorage)

    return () => {
        unsubscribe()
        window.removeEventListener('storage', handleStorage)
    }
}

export function useActiveSession() {
    return useSyncExternalStore(subscribe, getActiveSession, () => null)
}
