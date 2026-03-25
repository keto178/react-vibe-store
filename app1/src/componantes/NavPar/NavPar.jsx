import React from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import logo from "../../assets/img/ChatGPT Image Mar 22, 2026, 01_08_30 PM.png"
import search_icon from '../../assets/img/search_icon.png'
import basket_icon from '../../assets/img/basket_icon.png'
import './NavPar.css'
import { clearActiveSession, isDashboardOwner } from '../../utils/auth'

export default function NavPar({ activeSession, cartCount = 0, unreadOrdersCount = 0 }) {
    const navigate = useNavigate()
    const location = useLocation()
    const canOpenDashboard = isDashboardOwner(activeSession)
    const currentPath = location.pathname.toLowerCase()
    const currentSearchTerm = new URLSearchParams(location.search).get('search') || ''

    const isActivePath = (...paths) => paths.some((path) => path.toLowerCase() === currentPath)

    const handleLogout = () => {
        clearActiveSession()
        navigate('/Login')
    }

    const handleSearchSubmit = (event) => {
        event.preventDefault()
        const formData = new FormData(event.currentTarget)
        const trimmedSearchTerm = String(formData.get('search') || '').trim()
        const nextSearchParams = new URLSearchParams()

        if (trimmedSearchTerm) {
            nextSearchParams.set('search', trimmedSearchTerm)
        }

        navigate({
            pathname: '/Home',
            search: nextSearchParams.toString() ? `?${nextSearchParams.toString()}` : ''
        })
    }

    const handleClearSearch = () => {
        navigate('/Home')
    }

    return (
        <div className='NavPar-container'>
            <img className='logo' src={logo} alt="" />
            <ul className='open'>
                <li className={isActivePath('/', '/Home') ? "active" : ""}><Link to="/">Home</Link></li>
                <li className={isActivePath('/Orders') ? "active" : ""}><Link to="/Orders">Orders</Link></li>
                <li className={isActivePath('/About') ? "active" : ""}><Link to="/About">About</Link></li>
                <li className={isActivePath('/Contact') ? "active" : ""}><Link to="/Contact">Contact</Link></li>
            </ul>
            <div className="Navpar-contenar-right">
                <div className='Navpar-contenar-icons'>
                    <form className='nav-search-form' onSubmit={handleSearchSubmit} role="search">
                        <button
                            type="submit"
                            className='nav-search-button'
                            aria-label="Search products"
                            title="Search products"
                        >
                            <img src={search_icon} alt="" aria-hidden="true" />
                        </button>
                        <input
                            type="search"
                            name="search"
                            key={`${location.pathname}-${currentSearchTerm}`}
                            className='nav-search-input'
                            defaultValue={currentSearchTerm}
                            placeholder='Search products'
                            aria-label="Search products"
                        />
                        {currentSearchTerm && (
                            <button
                                type="button"
                                className='nav-search-clear'
                                onClick={handleClearSearch}
                            >
                                Clear
                            </button>
                        )}
                    </form>
                    <Link
                        to="/Cart"
                        className={`cart-shortcut ${isActivePath('/Cart', '/PlecOurder', '/Shipping') ? 'active' : ''}`}
                        aria-label="Cart"
                        title="Cart"
                    >
                        <img src={basket_icon} alt="Basket" />
                        <span className='cart-badge'>{cartCount}</span>
                    </Link>
                    {canOpenDashboard && (
                        <Link
                            to="/Orders"
                            className={`admin-notification ${isActivePath('/Orders') ? 'active' : ''}`}
                            aria-label="New orders"
                            title="New orders"
                        >
                            <svg viewBox="0 0 24 24" aria-hidden="true">
                                <path d="M12 2C8.69 2 6 4.69 6 8V11.1C6 11.66 5.81 12.21 5.47 12.66L4.19 14.36C3.37 15.46 4.15 17 5.53 17H18.47C19.85 17 20.63 15.46 19.81 14.36L18.53 12.66C18.19 12.21 18 11.66 18 11.1V8C18 4.69 15.31 2 12 2ZM12 22C13.48 22 14.75 21.19 15.44 20H8.56C9.25 21.19 10.52 22 12 22Z" />
                            </svg>
                            <span className='nav-icon-badge'>{unreadOrdersCount}</span>
                        </Link>
                    )}
                    {canOpenDashboard && (
                        <Link
                            to="/Dashboard"
                            className={`dashboard-shortcut ${isActivePath('/Dashboard') ? 'active' : ''}`}
                            aria-label="Dashboard"
                            title="Dashboard"
                        >
                            <svg viewBox="0 0 24 24" aria-hidden="true">
                                <path d="M4 13.5C4 12.67 4.67 12 5.5 12H10V19.5C10 20.33 9.33 21 8.5 21H5.5C4.67 21 4 20.33 4 19.5V13.5ZM14 4.5C14 3.67 14.67 3 15.5 3H18.5C19.33 3 20 3.67 20 4.5V10.5C20 11.33 19.33 12 18.5 12H14V4.5ZM4 4.5C4 3.67 4.67 3 5.5 3H8.5C9.33 3 10 3.67 10 4.5V10.5H4V4.5ZM14 15H20V19.5C20 20.33 19.33 21 18.5 21H15.5C14.67 21 14 20.33 14 19.5V15Z" />
                            </svg>
                        </Link>
                    )}
                </div>
                {activeSession ? (
                    <button type="button" className='btn' onClick={handleLogout}>Logout</button>
                ) : (
                    <>
                        <Link to="/Login" className='btn nav-auth-link'>Login</Link>
                        <Link to="/Signup" className='btn nav-auth-link'>Register</Link>
                    </>
                )}
            </div>
        </div>
    )
}
