import React from 'react'
import { Navigate } from 'react-router-dom'
import { isDashboardOwner } from '../services/session'

export default function ProtectedRoute({
    children,
    activeSession,
    requireAdmin = false,
    requireEmailVerificationComplete = true
}) {
    if (!activeSession) {
        return <Navigate to="/Login" replace />
    }

    if (requireEmailVerificationComplete && activeSession.requiresEmailVerification) {
        return <Navigate to="/VerifyEmail" replace />
    }

    if (requireAdmin && !isDashboardOwner(activeSession)) {
        return <Navigate to="/Home" replace />
    }

    return children
}
