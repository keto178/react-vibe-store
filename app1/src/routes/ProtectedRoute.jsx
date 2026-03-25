import React from 'react'
import { Navigate } from 'react-router-dom'
import { isDashboardOwner } from '../utils/auth'

export default function ProtectedRoute({ children, activeSession, requireAdmin = false }) {
    if (!activeSession) {
        return <Navigate to="/Login" replace />
    }

    if (requireAdmin && !isDashboardOwner(activeSession)) {
        return <Navigate to="/Home" replace />
    }

    return children
}
