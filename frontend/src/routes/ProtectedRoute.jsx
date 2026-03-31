import React from 'react'
import { Navigate } from 'react-router-dom'
import { isDashboardOwner } from '../services/session'

export default function ProtectedRoute({
    children,
    activeSession,
    requireAdmin = false,
    requirePhoneVerificationComplete = true
}) {
    if (!activeSession) {
        return <Navigate to="/Login" replace />
    }

    if (requirePhoneVerificationComplete && activeSession.requiresPhoneVerification) {
        return <Navigate to="/VerifyPhone" replace />
    }

    if (requireAdmin && !isDashboardOwner(activeSession)) {
        return <Navigate to="/Home" replace />
    }

    return children
}
