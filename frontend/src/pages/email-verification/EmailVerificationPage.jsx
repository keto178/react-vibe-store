import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { isDashboardOwner, saveActiveSession } from '../../services/session'
import {
    requestEmailVerificationCodeApi,
    verifyEmailVerificationCodeApi
} from '../../api'
import './EmailVerificationPage.css'

function resolvePostVerificationRoute(sessionUser) {
    return isDashboardOwner(sessionUser) ? '/Dashboard' : '/Home'
}

export default function EmailVerificationPage({ activeSession }) {
    const navigate = useNavigate()
    const [verificationCode, setVerificationCode] = useState('')
    const [status, setStatus] = useState({ type: '', text: '' })
    const [previewCode, setPreviewCode] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [hasRequestedCode, setHasRequestedCode] = useState(false)

    useEffect(() => {
        if (!activeSession) {
            navigate('/Login', { replace: true })
            return
        }

        if (!activeSession.requiresEmailVerification) {
            navigate(resolvePostVerificationRoute(activeSession), { replace: true })
        }
    }, [activeSession, navigate])

    const requestCode = async () => {
        setIsSubmitting(true)
        setStatus({ type: '', text: '' })

        try {
            const response = await requestEmailVerificationCodeApi()

            setHasRequestedCode(true)
            setVerificationCode('')
            setPreviewCode(response?.verificationCode || '')
            setStatus({
                type: 'success',
                text: response?.message || 'Verification code sent successfully.'
            })
        } catch (error) {
            setStatus({
                type: 'error',
                text: error?.message || 'Unable to send verification code right now.'
            })
        } finally {
            setIsSubmitting(false)
        }
    }

    const verifyCode = async (event) => {
        event.preventDefault()
        const code = verificationCode.trim()

        if (!code) {
            setStatus({ type: 'error', text: 'Please enter the verification code.' })
            return
        }

        setIsSubmitting(true)

        try {
            const response = await verifyEmailVerificationCodeApi({ code })
            const updatedUser = response?.user

            if (!updatedUser) {
                throw new Error('The API did not return a valid user payload.')
            }

            saveActiveSession({
                token: activeSession?.token || '',
                authMode: activeSession?.authMode || 'api',
                user: updatedUser
            })

            navigate(resolvePostVerificationRoute(updatedUser), { replace: true })
        } catch (error) {
            setStatus({
                type: 'error',
                text: error?.message || 'Verification failed. Please try again.'
            })
        } finally {
            setIsSubmitting(false)
        }
    }

    if (!activeSession) {
        return null
    }

    return (
        <section className='email-verification-page'>
            <div className='email-verification-card'>
                <h1>Verify Your Email</h1>
                <p className='email-verification-subtitle'>
                    We will send a short code to {activeSession.email} so you can finish activating your account.
                </p>

                {status.text && (
                    <p className={`email-verification-status ${status.type}`}>
                        {status.text}
                    </p>
                )}

                <button
                    type="button"
                    className='btn'
                    disabled={isSubmitting}
                    onClick={requestCode}
                >
                    {isSubmitting && !hasRequestedCode ? 'Sending...' : 'Send Email Code'}
                </button>

                {hasRequestedCode && (
                    <form className='email-verification-form' onSubmit={verifyCode}>
                        <label htmlFor="email-verification-code">Verification code</label>
                        <input
                            id="email-verification-code"
                            type="text"
                            inputMode="numeric"
                            value={verificationCode}
                            onChange={(event) => {
                                setVerificationCode(event.target.value)
                                setStatus({ type: '', text: '' })
                            }}
                            placeholder="Enter 6 digit code"
                            required
                        />

                        {previewCode && (
                            <p className='email-verification-preview'>
                                Testing code: <strong>{previewCode}</strong>
                            </p>
                        )}

                        <button type="submit" className='btn' disabled={isSubmitting}>
                            {isSubmitting ? 'Verifying...' : 'Verify Email'}
                        </button>
                    </form>
                )}
            </div>
        </section>
    )
}
