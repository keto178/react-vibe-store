import React, { memo, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import search_icon from '../../assets/img/search_icon.png'
import basket_icon from '../../assets/img/basket_icon.png'
import './NavBar.css'
import { clearActiveSession, isDashboardOwner } from '../../services/session'

const NavBar = memo(function NavBar({ activeSession, cartCount = 0, unreadOrdersCount = 0 }) {
    const navigate = useNavigate()
    const location = useLocation()
    const mobileSearchInputRef = useRef(null)
    const mobileSearchFocusTimeoutRef = useRef(0)
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
    const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false)
    const canOpenDashboard = isDashboardOwner(activeSession)
    const currentPath = location.pathname.toLowerCase()
    const currentSearchTerm = useMemo(() => new URLSearchParams(location.search).get('search') || '', [location.search])

    useEffect(() => {
        return () => {
            if (mobileSearchFocusTimeoutRef.current) {
                window.clearTimeout(mobileSearchFocusTimeoutRef.current)
            }
        }
    }, [])

    const isActivePath = (...paths) => paths.some((path) => path.toLowerCase() === currentPath)
    const isSearchActive = isMobileSearchOpen || currentSearchTerm.length > 0
    const accountPath = activeSession
        ? (activeSession.requiresEmailVerification ? '/VerifyEmail' : '/Orders')
        : '/Login'
    const isAccountActive = isActivePath('/Orders', '/Login', '/Signup', '/VerifyEmail')

    const handleLogout = () => {
        clearActiveSession()
        navigate('/Login')
        setIsMobileMenuOpen(false)
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

        setIsMobileSearchOpen(false)
        setIsMobileMenuOpen(false)
    }

    const handleClearSearch = () => {
        navigate('/Home')
        setIsMobileSearchOpen(false)
    }

    const handleMobileSearchShortcut = () => {
        if (!isActivePath('/', '/Home')) {
            navigate('/Home')
        }

        setIsMobileSearchOpen(true)
        setIsMobileMenuOpen(false)

        if (mobileSearchFocusTimeoutRef.current) {
            window.clearTimeout(mobileSearchFocusTimeoutRef.current)
        }

        mobileSearchFocusTimeoutRef.current = window.setTimeout(() => {
            mobileSearchInputRef.current?.focus()
        }, 120)
    }

    const closeMobilePanels = () => {
        setIsMobileMenuOpen(false)
        setIsMobileSearchOpen(false)
    }

    return (
        <>
            <header className='NavPar-container'>
                <div className='nav-mobile-shell'>
                    <div className='nav-mobile-top'>
                        <button
                            type="button"
                            className='nav-mobile-icon'
                            onClick={() => setIsMobileMenuOpen((currentValue) => !currentValue)}
                            aria-label="Open menu"
                            title="Menu"
                        >
                            <svg viewBox="0 0 24 24" aria-hidden="true">
                                <path d="M4 7H20V9H4V7ZM4 11H20V13H4V11ZM4 15H20V17H4V15Z" />
                            </svg>
                        </button>

                        <div className='nav-mobile-center-spacer' aria-hidden="true" />

                        <div className='nav-mobile-actions'>
                            <button
                                type="button"
                                className={`nav-mobile-icon ${isSearchActive ? 'active' : ''}`}
                                onClick={handleMobileSearchShortcut}
                                aria-label="Search products"
                                title="Search products"
                            >
                                <svg viewBox="0 0 24 24" aria-hidden="true">
                                    <path d="M15.5 14H14.71L14.43 13.73C15.41 12.59 16 11.11 16 9.5C16 5.91 13.09 3 9.5 3C5.91 3 3 5.91 3 9.5C3 13.09 5.91 16 9.5 16C11.11 16 12.59 15.41 13.73 14.43L14 14.71V15.5L19 20.49L20.49 19L15.5 14ZM9.5 14C7.01 14 5 11.99 5 9.5C5 7.01 7.01 5 9.5 5C11.99 5 14 7.01 14 9.5C14 11.99 11.99 14 9.5 14Z" />
                                </svg>
                            </button>

                            <Link
                                to="/Cart"
                                className={`nav-mobile-icon cart-shortcut ${isActivePath('/Cart', '/PlecOurder', '/Shipping') ? 'active' : ''}`}
                                aria-label="Cart"
                                title="Cart"
                                onClick={closeMobilePanels}
                            >
                                <svg viewBox="0 0 24 24" aria-hidden="true">
                                    <path d="M7 18C5.9 18 5.01 18.9 5.01 20C5.01 21.1 5.9 22 7 22C8.1 22 9 21.1 9 20C9 18.9 8.1 18 7 18ZM1 2V4H3L6.6 11.59L5.25 14.04C5.09 14.32 5 14.65 5 15C5 16.1 5.9 17 7 17H19V15H7.42C7.28 15 7.17 14.89 7.17 14.75L7.2 14.63L8.1 13H15.55C16.3 13 16.96 12.59 17.3 11.97L20.88 5.5C20.96 5.34 21 5.17 21 5C21 4.45 20.55 4 20 4H5.21L4.27 2H1ZM17 18C15.9 18 15.01 18.9 15.01 20C15.01 21.1 15.9 22 17 22C18.1 22 19 21.1 19 20C19 18.9 18.1 18 17 18Z" />
                                </svg>
                                <span className='cart-badge'>{cartCount}</span>
                            </Link>

                            <Link
                                to={accountPath}
                                className={`nav-mobile-icon ${isAccountActive ? 'active' : ''}`}
                                aria-label="Account"
                                title="Account"
                                onClick={closeMobilePanels}
                            >
                                <svg viewBox="0 0 24 24" aria-hidden="true">
                                    <path d="M12 12C14.76 12 17 9.76 17 7C17 4.24 14.76 2 12 2C9.24 2 7 4.24 7 7C7 9.76 9.24 12 12 12ZM12 14.5C8.66 14.5 2 16.17 2 19.5V22H22V19.5C22 16.17 15.34 14.5 12 14.5Z" />
                                </svg>
                            </Link>
                        </div>
                    </div>

                    <div className={`nav-mobile-search ${isMobileSearchOpen ? 'open' : ''}`}>
                        <form className='nav-search-form nav-search-form-mobile' onSubmit={handleSearchSubmit} role="search">
                            <button
                                type="submit"
                                className='nav-search-button'
                                aria-label="Search products"
                                title="Search products"
                            >
                                <img src={search_icon} alt="" aria-hidden="true" />
                            </button>
                            <input
                                ref={mobileSearchInputRef}
                                id="mobile-nav-search"
                                type="search"
                                name="search"
                                key={`mobile-${location.pathname}-${currentSearchTerm}`}
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
                    </div>

                    <div className={`nav-mobile-menu ${isMobileMenuOpen ? 'open' : ''}`}>
                        <Link to="/Home" className={isActivePath('/', '/Home') ? "active" : ""} onClick={closeMobilePanels}>Home</Link>
                        <Link to="/Orders" className={isActivePath('/Orders') ? "active" : ""} onClick={closeMobilePanels}>Orders</Link>
                        {canOpenDashboard && (
                            <Link to="/Dashboard" className={isActivePath('/Dashboard') ? "active" : ""} onClick={closeMobilePanels}>
                                Dashboard
                            </Link>
                        )}
                        {activeSession ? (
                            <button type="button" className='btn nav-mobile-auth-btn' onClick={handleLogout}>Logout</button>
                        ) : (
                            <div className='nav-mobile-auth-row'>
                                <Link to="/Login" className='btn nav-auth-link' onClick={closeMobilePanels}>Login</Link>
                                <Link to="/Signup" className='btn nav-auth-link' onClick={closeMobilePanels}>Register</Link>
                            </div>
                        )}
                    </div>
                </div>

                <div className='nav-desktop-shell'>
                    <ul className='open'>
                        <li className={isActivePath('/', '/Home') ? "active" : ""}><Link to="/Home">Home</Link></li>
                        <li className={isActivePath('/Orders') ? "active" : ""}><Link to="/Orders">Orders</Link></li>
                        {canOpenDashboard && (
                            <li className={isActivePath('/Dashboard') ? "active" : ""}><Link to="/Dashboard">Dashboard</Link></li>
                        )}
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
                                    key={`desktop-${location.pathname}-${currentSearchTerm}`}
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
            </header>

            <nav className='mobile-bottom-nav' aria-label="Mobile navigation">
                <Link
                    to="/Home"
                    className={`mobile-bottom-nav-item ${isActivePath('/', '/Home') && !isSearchActive ? 'active' : ''}`}
                    onClick={closeMobilePanels}
                >
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M12 3L3 10.5V21H9V14H15V21H21V10.5L12 3Z" />
                    </svg>
                    <span>Home</span>
                </Link>

                <button
                    type="button"
                    className={`mobile-bottom-nav-item mobile-bottom-nav-button ${isSearchActive ? 'active' : ''}`}
                    onClick={handleMobileSearchShortcut}
                >
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M15.5 14H14.71L14.43 13.73C15.41 12.59 16 11.11 16 9.5C16 5.91 13.09 3 9.5 3C5.91 3 3 5.91 3 9.5C3 13.09 5.91 16 9.5 16C11.11 16 12.59 15.41 13.73 14.43L14 14.71V15.5L19 20.49L20.49 19L15.5 14ZM9.5 14C7.01 14 5 11.99 5 9.5C5 7.01 7.01 5 9.5 5C11.99 5 14 7.01 14 9.5C14 11.99 11.99 14 9.5 14Z" />
                    </svg>
                    <span>Search</span>
                </button>

                <Link
                    to="/Home"
                    className={`mobile-bottom-nav-item ${isActivePath('/', '/Home') && !isSearchActive ? 'active' : ''}`}
                    onClick={closeMobilePanels}
                >
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M4 4H10V10H4V4ZM14 4H20V10H14V4ZM4 14H10V20H4V14ZM14 14H20V20H14V14Z" />
                    </svg>
                    <span>Shop</span>
                </Link>

                <Link
                    to={accountPath}
                    className={`mobile-bottom-nav-item ${isAccountActive ? 'active' : ''}`}
                    onClick={closeMobilePanels}
                >
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M12 12C14.76 12 17 9.76 17 7C17 4.24 14.76 2 12 2C9.24 2 7 4.24 7 7C7 9.76 9.24 12 12 12ZM12 14.5C8.66 14.5 2 16.17 2 19.5V22H22V19.5C22 16.17 15.34 14.5 12 14.5Z" />
                    </svg>
                    <span>Account</span>
                </Link>

                <Link
                    to="/Cart"
                    className={`mobile-bottom-nav-item ${isActivePath('/Cart', '/PlecOurder', '/Shipping') ? 'active' : ''}`}
                    onClick={closeMobilePanels}
                >
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M7 18C5.9 18 5.01 18.9 5.01 20C5.01 21.1 5.9 22 7 22C8.1 22 9 21.1 9 20C9 18.9 8.1 18 7 18ZM1 2V4H3L6.6 11.59L5.25 14.04C5.09 14.32 5 14.65 5 15C5 16.1 5.9 17 7 17H19V15H7.42C7.28 15 7.17 14.89 7.17 14.75L7.2 14.63L8.1 13H15.55C16.3 13 16.96 12.59 17.3 11.97L20.88 5.5C20.96 5.34 21 5.17 21 5C21 4.45 20.55 4 20 4H5.21L4.27 2H1ZM17 18C15.9 18 15.01 18.9 15.01 20C15.01 21.1 15.9 22 17 22C18.1 22 19 21.1 19 20C19 18.9 18.1 18 17 18Z" />
                    </svg>
                    <span>Cart</span>
                    <strong className='mobile-bottom-badge'>{cartCount}</strong>
                </Link>
            </nav>
        </>
    )
})

export default NavBar
