import React from 'react'

function formatApiModeLabel(serverHealth) {
    if (serverHealth?.apiMode === 'mongodb') {
        return 'MongoDB'
    }

    if (serverHealth?.apiMode === 'file') {
        return 'Local File Storage'
    }

    if (serverHealth?.apiMode === 'blob') {
        return 'Vercel Blob Storage'
    }

    if (serverHealth?.apiMode === 'memory') {
        return 'Temporary Preview'
    }

    return 'Unknown Backend'
}

export default function DashboardHeader({
    categoriesCount,
    productsCount,
    serverHealth,
    isReadOnly,
    readOnlyMessage,
    onLogout
}) {
    return (
        <>
            <div className='dashboard-intro'>
                <div>
                    <p className='dashboard-badge'>Admin Only</p>
                    <h1>Dashboard Manager</h1>
                    <p className='dashboard-text'>
                        Add categories first, then assign products to the category you want. Category lists are now separated into devices and liquid.
                    </p>
                </div>
                <button type="button" className='dashboard-logout' onClick={onLogout}>
                    Logout
                </button>
            </div>

            <div className={`dashboard-runtime-banner ${isReadOnly ? 'warning' : 'info'}`}>
                <strong>{formatApiModeLabel(serverHealth)}</strong>
                <span>{isReadOnly ? readOnlyMessage : (serverHealth?.message || 'The backend is ready for persistent catalog updates.')}</span>
                {!isReadOnly && serverHealth?.setupHint && <span>{serverHealth.setupHint}</span>}
            </div>

            <div className='dashboard-form-summary'>
                <div className='dashboard-summary-card'>
                    <span>Categories</span>
                    <strong>{categoriesCount}</strong>
                </div>
                <div className='dashboard-summary-card'>
                    <span>Products</span>
                    <strong>{productsCount}</strong>
                </div>
            </div>
        </>
    )
}
