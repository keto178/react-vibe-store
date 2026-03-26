import React from 'react'
import { Link } from 'react-router-dom'
import './Footer.css'

export default function Footer({ activeSession }) {
    return (
        <footer className='site-footer'>
            <div className='site-footer-inner'>
                <div className='site-footer-brand'>
                    <strong>Hamza Vape Store</strong>
                    <p>Mobile-ready shopping for vape devices and liquids.</p>
                </div>

                <nav className='site-footer-links' aria-label="Footer navigation">
                    <Link to="/Home">Home</Link>
                    <Link to="/Orders">Orders</Link>
                    <Link to="/Cart">Cart</Link>
                    <Link to={activeSession ? '/Orders' : '/Login'}>
                        {activeSession ? 'Account' : 'Login'}
                    </Link>
                </nav>
            </div>

            <p className='site-footer-copy'>© {new Date().getFullYear()} Hamza Vape Store</p>
        </footer>
    )
}
