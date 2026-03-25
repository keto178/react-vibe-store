import React from 'react'

export default function EmailStatus({ emailNotification }) {
    const emailStatus = emailNotification?.status || 'pending'
    const emailMessage = emailNotification?.message || ''

    return (
        <div className={`orders-email-status ${emailStatus}`}>
            <strong>
                {emailStatus === 'sent' && 'Email sent to admin'}
                {emailStatus === 'failed' && 'Admin email failed'}
                {emailStatus === 'skipped' && 'Email not configured'}
                {emailStatus === 'pending' && 'Email pending'}
            </strong>
            {emailMessage && <p>{emailMessage}</p>}
        </div>
    )
}
