import React from 'react'

export default function DashboardHeader({ categoriesCount, productsCount, onLogout }) {
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
