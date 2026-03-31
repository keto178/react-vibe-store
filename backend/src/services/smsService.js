import env from '../config/env.js'
import { AppError } from '../app/errors/AppError.js'

function isTwilioConfigured() {
    return Boolean(
        env.twilioAccountSid &&
        env.twilioAuthToken &&
        env.twilioFromNumber
    )
}

async function sendSmsWithTwilio({ to, message }) {
    const authToken = Buffer.from(`${env.twilioAccountSid}:${env.twilioAuthToken}`).toString('base64')
    const response = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${env.twilioAccountSid}/Messages.json`,
        {
            method: 'POST',
            headers: {
                Authorization: `Basic ${authToken}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
                To: to,
                From: env.twilioFromNumber,
                Body: message
            }).toString()
        }
    )

    if (!response.ok) {
        let details = ''

        try {
            const errorBody = await response.json()
            details = errorBody?.message || ''
        } catch {
            details = ''
        }

        throw new Error(
            details ||
            `SMS provider failed with status ${response.status}.`
        )
    }
}

export async function sendPhoneVerificationCodeSms({ phoneNumber, code }) {
    const smsMessage = `Your verification code is: ${code}`

    if (!isTwilioConfigured()) {
        if (env.isProduction) {
            throw new AppError(
                503,
                'SMS_PROVIDER_UNAVAILABLE',
                'Phone verification is temporarily unavailable. Please try again later.'
            )
        }

        return {
            delivery: 'preview',
            provider: 'preview',
            verificationCode: code,
            message: 'SMS provider is not configured. Using verification code preview.'
        }
    }

    await sendSmsWithTwilio({
        to: phoneNumber,
        message: smsMessage
    })

    return {
        delivery: 'sms',
        provider: 'twilio',
        verificationCode: ''
    }
}
