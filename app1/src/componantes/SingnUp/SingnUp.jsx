import React, { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './SingnUp.css'
import { isDashboardOwner, saveActiveSession } from '../../utils/auth'
import { loginUserApi, registerUserApi } from '../../utils/api'

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
    const [isLogin, setIsLogin] = useState(initialMode !== 'signup')
    const [status, setStatus] = useState({ type: '', text: '' })
    const [loginForm, setLoginForm] = useState(EMPTY_LOGIN_FORM)
    const [signupForm, setSignupForm] = useState(EMPTY_SIGNUP_FORM)
    const loginEmailInputRef = useRef(null)
    const loginPasswordInputRef = useRef(null)
    const signupUsernameInputRef = useRef(null)
    const signupEmailInputRef = useRef(null)
    const signupPasswordInputRef = useRef(null)
    const signupConfirmPasswordInputRef = useRef(null)
    const showLoginForm = isLogin

    const resetForms = () => {
        setLoginForm(EMPTY_LOGIN_FORM)
        setSignupForm(EMPTY_SIGNUP_FORM)
    }

    const clearVisibleInputValues = () => {
        const refs = [
            loginEmailInputRef,
            loginPasswordInputRef,
            signupUsernameInputRef,
            signupEmailInputRef,
            signupPasswordInputRef,
            signupConfirmPasswordInputRef
        ]

        refs.forEach((inputRef) => {
            if (inputRef.current) {
                inputRef.current.value = ''
            }
        })
    }

    useEffect(() => {
        const timeoutId = window.setTimeout(() => {
            resetForms()
            clearVisibleInputValues()
        }, 0)

        return () => window.clearTimeout(timeoutId)
    }, [showLoginForm])

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
        const fieldName = event.target.dataset.field || event.target.name
        const { value } = event.target

        setLoginForm((current) => ({
            ...current,
            [fieldName]: value
        }))
        setStatus({ type: '', text: '' })
    }

    const handleSignupChange = (event) => {
        const fieldName = event.target.dataset.field || event.target.name
        const { value } = event.target

        setSignupForm((current) => ({
            ...current,
            [fieldName]: value
        }))
        setStatus({ type: '', text: '' })
    }

    const handleSignupSubmit = async (event) => {
        event.preventDefault()

        const username = signupForm.username.trim()
        const email = signupForm.email.trim()

        if (!username || !email || !signupForm.password || !signupForm.confirmPassword) {
            setStatus({ type: 'error', text: 'Please fill in all signup fields.' })
            return
        }

        if (signupForm.password !== signupForm.confirmPassword) {
            setStatus({ type: 'error', text: 'Passwords do not match.' })
            return
        }

        try {
            const authResponse = await registerUserApi({
                username,
                email,
                password: signupForm.password
            })

            saveActiveSession(authResponse)
            setStatus({ type: 'success', text: 'Account created successfully.' })
            navigate('/Home')
        } catch (error) {
            setStatus({ type: 'error', text: error.message })
        }
    }

    const handleLoginSubmit = async (event) => {
        event.preventDefault()

        try {
            const authResponse = await loginUserApi(loginForm)

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
            setStatus({ type: 'error', text: error.message })
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
                    <form className='login-form' onSubmit={handleLoginSubmit} autoComplete="off">
                        <h1>Login</h1>
                        {status.text && showLoginForm && <p className={`form-status ${status.type}`}>{status.text}</p>}
                        <input className='auth-ghost-input' type="text" autoComplete="username" tabIndex="-1" aria-hidden="true" />
                        <input className='auth-ghost-input' type="password" autoComplete="current-password" tabIndex="-1" aria-hidden="true" />
                        <input
                            ref={loginEmailInputRef}
                            type="email"
                            name="login_email"
                            data-field="email"
                            placeholder='Email'
                            value={loginForm.email}
                            required
                            onChange={handleLoginChange}
                            autoComplete="off"
                            autoCapitalize="none"
                            autoCorrect="off"
                            spellCheck={false}
                        />
                        <input
                            ref={loginPasswordInputRef}
                            type="password"
                            name="login_password"
                            data-field="password"
                            placeholder='Password'
                            value={loginForm.password}
                            required
                            onChange={handleLoginChange}
                            autoComplete="new-password"
                        />
                        <button type="submit" className='btn'>Login</button>
                        <p className='form-text'>Admin login opens the dashboard directly.</p>
                        <p className='form-text'>Don&apos;t have an account? <span onClick={openSignup}>Sign Up</span></p>
                    </form>

                    <form className='signup-form' onSubmit={handleSignupSubmit} autoComplete="off">
                        <h1>Sign Up</h1>
                        {status.text && !showLoginForm && <p className={`form-status ${status.type}`}>{status.text}</p>}
                        <input
                            ref={signupUsernameInputRef}
                            type="text"
                            name="signup_username"
                            data-field="username"
                            placeholder='Username'
                            value={signupForm.username}
                            onChange={handleSignupChange}
                            required
                            autoComplete="off"
                        />
                        <input
                            ref={signupEmailInputRef}
                            type="email"
                            name="signup_email"
                            data-field="email"
                            placeholder='Email'
                            value={signupForm.email}
                            onChange={handleSignupChange}
                            required
                            autoComplete="off"
                            autoCapitalize="none"
                            autoCorrect="off"
                            spellCheck={false}
                        />
                        <input
                            ref={signupPasswordInputRef}
                            type="password"
                            name="signup_password"
                            data-field="password"
                            placeholder='Password'
                            value={signupForm.password}
                            onChange={handleSignupChange}
                            required
                            autoComplete="new-password"
                        />
                        <input
                            ref={signupConfirmPasswordInputRef}
                            type="password"
                            name="signup_confirm_password"
                            data-field="confirmPassword"
                            placeholder='Confirm Password'
                            value={signupForm.confirmPassword}
                            onChange={handleSignupChange}
                            required
                            autoComplete="new-password"
                        />
                        <button type="submit" className='btn'>Sign Up</button>
                        <p className='form-text'>Already have an account? <span onClick={openLogin}>Login</span></p>
                    </form>
                </div>
            </div>
        </div>
    )
}
