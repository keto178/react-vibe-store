import React from 'react'
import './Header.css'

export default function Header({ hasProducts, onBrowseProducts }) {
    return (
        <section className='header-container'>
            <div className='header-background'>
                <div className='header-soft-glow header-soft-glow-one' />
                <div className='header-soft-glow header-soft-glow-two' />
            </div>
            <div className='header-overlay' />
            <div className='header-container-item'>
                <p className='header-badge'>Premium Vape Store</p>
                <h1>Vape devices and liquids, presented in a cleaner home experience.</h1>
                <p className='header-description'>
                    Browse products added by the admin dashboard, explore vivid product cards, and keep the storefront ready for the next launch.
                </p>
                <div className='header-actions'>
                    <button type="button" onClick={onBrowseProducts}>
                        {hasProducts ? 'Browse Products' : 'View Collection Area'}
                    </button>
                    <span className='header-note'>Admin products sync instantly to the home page.</span>
                </div>
            </div>
        </section>
    )
}
