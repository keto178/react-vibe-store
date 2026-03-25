import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './SingnUp.css'
import { isDashboardOwner, saveActiveSession } from '../../utils/auth'
import { loginUserApi, registerUserApi } from '../../utils/api'
import { useActiveSession } from '../../hooks/useActiveSession'

const EMPTY_LOGIN_FORM = {
    email: '',
    password: ''
}

const EMPTY_SIGNUP_FORM = {
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
}

export default function SingnUp({ initialMode = 'login' }) {
    const navigate = useNavigate()
    const activeSession = useActiveSession()
    const [isLogin, setIsLogin] = useState(initialMode !== 'signup')
    const [status, setStatus] = useState({ type: '', text: '' })
    const [loginForm, setLoginForm] = useState(EMPTY_LOGIN_FORM)
    const [signupForm, setSignupForm] = useState(EMPTY_SIGNUP_FORM)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const showLoginForm = isLogin

    const resetForms = () => {
        setLoginForm(EMPTY_LOGIN_FORM)
        setSignupForm(EMPTY_SIGNUP_FORM)
    }

    useEffect(() => {
        setIsLogin(initialMode !== 'signup')
        setStatus({ type: '', text: '' })
        resetForms()
    }, [initialMode])

    useEffect(() => {
        if (!activeSession) {
            return
        }

        navigate(isDashboardOwner(activeSession) ? '/Dashboard' : '/Home', {
            replace: true
        })
    }, [activeSession, navigate])

    const openLogin = () => {
        setStatus({ type: '', text: '' })
        resetForms()
        setIsLogin(true)
        navigate('/Login')
    }

    const openSignup = () => {
        setStatus({ type: '', text: '' })
        resetForms()
        setIsLogin(false)
        navigate('/Signup')
    }

    const handleLoginChange = (event) => {
        const { name, value } = event.target

        setLoginForm((current) => ({
            ...current,
            [name]: value
        }))
        setStatus({ type: '', text: '' })
    }

    const handleSignupChange = (event) => {
        const { name, value } = event.target

        setSignupForm((current) => ({
            ...current,
            [name]: value
        }))
        setStatus({ type: '', text: '' })
    }

    const handleSignupSubmit = async (event) => {
        event.preventDefault()

        const username = signupForm.username.trim()
        const email = signupForm.email.trim().toLowerCase()

        if (!username || !email || !signupForm.password || !signupForm.confirmPassword) {
            setStatus({ type: 'error', text: 'Please fill in all signup fields.' })
            return
        }

        if (signupForm.password !== signupForm.confirmPassword) {
            setStatus({ type: 'error', text: 'Passwords do not match.' })
            return
        }

        setIsSubmitting(true)

        try {
            const authResponse = await registerUserApi({
                username,
                email,
                password: signupForm.password
            })

            saveActiveSession(authResponse)
            setStatus({
                type: 'success',
                text: `Account created successfully. Welcome, ${authResponse.user.username}.`
            })
            navigate('/Home')
        } catch (error) {
            console.error('[auth/register] Request failed.', {
                email,
                username,
                errorMessage: error?.message || 'Unknown error'
            })
            setStatus({
                type: 'error',
                text: error?.message || 'Unable to create your account right now. Please try again.'
            })
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleLoginSubmit = async (event) => {
        event.preventDefault()

        const email = loginForm.email.trim().toLowerCase()

        if (!email || !loginForm.password) {
            setStatus({ type: 'error', text: 'Please enter your email and password.' })
            return
        }

        setIsSubmitting(true)

        try {
            const authResponse = await loginUserApi({
                email,
                password: loginForm.password
            })

            saveActiveSession(authResponse)
            setStatus({
                type: 'success',
                text: isDashboardOwner(authResponse.user)
                    ? `Welcome back, ${authResponse.user.username}. Admin access is enabled.`
                    : `Welcome back, ${authResponse.user.username}.`
            })
            setLoginForm(EMPTY_LOGIN_FORM)
            navigate(isDashboardOwner(authResponse.user) ? '/Dashboard' : '/Home')
        } catch (error) {
            console.error('[auth/login] Request failed.', {
                email,
                errorMessage: error?.message || 'Unknown error'
            })
            setStatus({
                type: 'error',
                text: error?.message || 'Unable to log in right now. Please try again.'
            })
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div className='SingnUp-container'>
            <div className='form-wrapper'>
                <div className='toggle-buttons'>
                    <button
                        type="button"
                        className={`toggle-btn ${showLoginForm ? 'active' : ''}`}
                        onClick={openLogin}
                    >
                        Login
                    </button>
                    <button
                        type="button"
                        className={`toggle-btn ${!showLoginForm ? 'active' : ''}`}
                        onClick={openSignup}
                    >
                        Sign Up
                    </button>
                </div>

                <div className={`form-container ${showLoginForm ? 'login-active' : 'signup-active'}`}>
                    <form className='login-form' onSubmit={handleLoginSubmit} autoComplete="on">
                        <h1>Login</h1>
                        {status.text && showLoginForm && <p className={`form-status ${status.type}`}>{status.text}</p>}
                        <input
                            type="email"
                            name="email"
                            placeholder='Email'
                            value={loginForm.email}
                            required
                            onChange={handleLoginChange}
                            autoComplete="email"
                            autoCapitalize="none"
                            autoCorrect="off"
                            spellCheck={false}
                        />
                        <input
                            type="password"
                            name="password"
                            placeholder='Password'
                            value={loginForm.password}
                            required
                            onChange={handleLoginChange}
                            autoComplete="current-password"
                        />
                        <button type="submit" className='btn' disabled={isSubmitting}>
                            {isSubmitting ? 'Logging In...' : 'Login'}
                        </button>
                        <p className='form-text'>Admin login opens the dashboard directly.</p>
                        <p className='form-text'>Don&apos;t have an account? <span onClick={openSignup}>Sign Up</span></p>
                    </form>

                    <form className='signup-form' onSubmit={handleSignupSubmit} autoComplete="on">
                        <h1>Sign Up</h1>
                        {status.text && !showLoginForm && <p className={`form-status ${status.type}`}>{status.text}</p>}
                        <input
                            type="text"
                            name="username"
                            placeholder='Username'
                            value={signupForm.username}
                            onChange={handleSignupChange}
                            required
                            autoComplete="username"
                        />
                        <input
                            type="email"
                            name="email"
                            placeholder='Email'
                            value={signupForm.email}
                            onChange={handleSignupChange}
                            required
                            autoComplete="email"
                            autoCapitalize="none"
                            autoCorrect="off"
                            spellCheck={false}
                        />
                        <input
                            type="password"
                            name="password"
                            placeholder='Password'
                            value={signupForm.password}
                            onChange={handleSignupChange}
                            required
                            autoComplete="new-password"
                        />
                        <input
                            type="password"
                            name="confirmPassword"
                            placeholder='Confirm Password'
                            value={signupForm.confirmPassword}
                            onChange={handleSignupChange}
                            required
                            autoComplete="new-password"
                        />
                        <button type="submit" className='btn' disabled={isSubmitting}>
                            {isSubmitting ? 'Creating Account...' : 'Sign Up'}
                        </button>
                        <p className='form-text'>Already have an account? <span onClick={openLogin}>Login</span></p>
                    </form>
                </div>
            </div>
        </div>
    )
}
