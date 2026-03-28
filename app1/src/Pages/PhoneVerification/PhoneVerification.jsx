import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { isDashboardOwner, saveActiveSession } from '../../utils/auth'
import {
    requestPhoneVerificationCodeApi,
    verifyPhoneVerificationCodeApi
} from '../../utils/api'
import './PhoneVerification.css'

function resolvePostVerificationRoute(sessionUser) {
    return isDashboardOwner(sessionUser) ? '/Dashboard' : '/Home'
}

export default function PhoneVerification({ activeSession }) {
    const navigate = useNavigate()
    const [phoneNumber, setPhoneNumber] = useState('')
    const [verificationCode, setVerificationCode] = useState('')
    const [status, setStatus] = useState({ type: '', text: '' })
    const [previewCode, setPreviewCode] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [step, setStep] = useState('request')

    useEffect(() => {
        if (!activeSession) {
            navigate('/Login', { replace: true })
            return
        }

        if (!activeSession.requiresPhoneVerification) {
            navigate(resolvePostVerificationRoute(activeSession), { replace: true })
        }
    }, [activeSession, navigate])

    const requestCode = async (event) => {
        event.preventDefault()
        const normalizedPhoneNumber = phoneNumber.trim()

        if (!normalizedPhoneNumber) {
            setStatus({ type: 'error', text: 'Please enter your phone number first.' })
            return
        }

        setIsSubmitting(true)

        try {
            const response = await requestPhoneVerificationCodeApi({
                phoneNumber: normalizedPhoneNumber
            })

            setStep('verify')
            setVerificationCode('')
            setPreviewCode(response?.verificationCode || '')
            setStatus({
                type: 'success',
                text: response?.message || 'Verification code generated successfully.'
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
            const response = await verifyPhoneVerificationCodeApi({ code })
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
        <section className='phone-verification-page'>
            <div className='phone-verification-card'>
                <h1>Verify Your Phone</h1>
                <p className='phone-verification-subtitle'>
                    Complete one quick step to secure your account before placing orders.
                </p>

                {status.text && (
                    <p className={`phone-verification-status ${status.type}`}>
                        {status.text}
                    </p>
                )}

                {step === 'request' ? (
                    <form className='phone-verification-form' onSubmit={requestCode}>
                        <label htmlFor="phone-number">Phone number</label>
                        <input
                            id="phone-number"
                            type="tel"
                            value={phoneNumber}
                            onChange={(event) => {
                                setPhoneNumber(event.target.value)
                                setStatus({ type: '', text: '' })
                            }}
                            placeholder="+201234567890"
                            autoComplete="tel"
                            required
                        />
                        <button type="submit" className='btn' disabled={isSubmitting}>
                            {isSubmitting ? 'Sending...' : 'Send Verification Code'}
                        </button>
                    </form>
                ) : (
                    <form className='phone-verification-form' onSubmit={verifyCode}>
                        <label htmlFor="verification-code">Verification code</label>
                        <input
                            id="verification-code"
                            type="text"
                            inputMode="numeric"
                            value={verificationCode}
                            onChange={(event) => {
                                setVerificationCode(event.target.value)
                                setStatus({ type: '', text: '' })
                            }}
                            placeholder="Enter 4-6 digit code"
                            required
                        />

                        {previewCode && (
                            <p className='phone-verification-preview'>
                                Testing code: <strong>{previewCode}</strong>
                            </p>
                        )}

                        <div className='phone-verification-actions'>
                            <button type="submit" className='btn' disabled={isSubmitting}>
                                {isSubmitting ? 'Verifying...' : 'Verify Phone'}
                            </button>
                            <button
                                type="button"
                                className='btn secondary'
                                disabled={isSubmitting}
                                onClick={() => setStep('request')}
                            >
                                Change Number
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </section>
    )
}
