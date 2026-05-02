import nodemailer from 'nodemailer'
import env from '../config/env.js'
import { formatShippingAddress, getDiscountedPrice } from '../utils/order.js'

function buildOrderItemsText(order) {
    return order.items.map((item) => (
        `${item.name} x${item.quantity} (${item.selectedColor}) - $${(getDiscountedPrice(item) * item.quantity).toFixed(2)}`
    )).join('\n')
}

function buildHtmlMessage(order) {
    const rows = order.items.map((item) => `
        <tr>
            <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">${item.name}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">${item.quantity}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">${item.selectedColor}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">$${(getDiscountedPrice(item) * item.quantity).toFixed(2)}</td>
        </tr>
    `).join('')

    return `
        <div style="font-family:Arial,sans-serif;color:#111827;">
            <h2>New Order ${order.id}</h2>
            <p><strong>Date:</strong> ${new Date(order.createdAt).toLocaleString()}</p>
            <p><strong>Customer:</strong> ${order.customer.fullName}</p>
            <p><strong>Email:</strong> ${order.customer.email}</p>
            <p><strong>Phone:</strong> ${order.customer.phone}</p>
            <p><strong>Shipping Address:</strong> ${formatShippingAddress(order.customer)}</p>
            <p><strong>Total:</strong> $${order.summary.total.toFixed(2)}</p>
            <table style="width:100%;border-collapse:collapse;margin-top:16px;">
                <thead>
                    <tr>
                        <th style="text-align:left;padding:8px 12px;background:#f3f4f6;">Product</th>
                        <th style="text-align:left;padding:8px 12px;background:#f3f4f6;">Qty</th>
                        <th style="text-align:left;padding:8px 12px;background:#f3f4f6;">Color</th>
                        <th style="text-align:left;padding:8px 12px;background:#f3f4f6;">Line Total</th>
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>
            <p style="margin-top:16px;"><strong>Notes:</strong> ${order.customer.notes || 'No additional notes.'}</p>
        </div>
    `
}

function createTransporter() {
    if (!env.smtpHost || !env.smtpUser || !env.smtpPass || !env.adminNotificationEmail) {
        return null
    }

    return nodemailer.createTransport({
        host: env.smtpHost,
        port: env.smtpPort,
        secure: env.smtpSecure,
        auth: {
            user: env.smtpUser,
            pass: env.smtpPass
        }
    })
}

export async function sendAdminOrderEmail(order) {
    const transporter = createTransporter()

    if (!transporter) {
        return {
            status: 'skipped',
            message: 'SMTP is not configured yet. Add SMTP settings to enable admin emails.'
        }
    }

    await transporter.sendMail({
        from: env.smtpFrom,
        to: env.adminNotificationEmail,
        subject: `New order ${order.id}`,
        text: [
            `Order ID: ${order.id}`,
            `Date: ${new Date(order.createdAt).toLocaleString()}`,
            `Customer: ${order.customer.fullName}`,
            `Customer Email: ${order.customer.email}`,
            `Phone: ${order.customer.phone}`,
            `Shipping Address: ${formatShippingAddress(order.customer)}`,
            `Items: ${order.summary.itemCount}`,
            `Total: $${order.summary.total.toFixed(2)}`,
            '',
            buildOrderItemsText(order),
            '',
            `Notes: ${order.customer.notes || 'No additional notes.'}`
        ].join('\n'),
        html: buildHtmlMessage(order)
    })

    return {
        status: 'sent',
        message: `Admin notification sent to ${env.adminNotificationEmail}.`
    }
}

export async function sendEmailVerificationCodeEmail({ email, username, code }) {
    const transporter = createTransporter()

    if (!transporter) {
        return {
            delivery: 'preview',
            message: 'SMTP is not configured. Verification code is available in preview mode.',
            verificationCode: code
        }
    }

    await transporter.sendMail({
        from: env.smtpFrom,
        to: email,
        subject: 'Verify your email address',
        text: [
            `Hi ${username || 'there'},`,
            '',
            `Your verification code is: ${code}`,
            '',
            'Enter this code to finish verifying your account.'
        ].join('\n'),
        html: `
            <div style="font-family:Arial,sans-serif;color:#111827;">
                <h2>Verify your email address</h2>
                <p>Hi ${username || 'there'},</p>
                <p>Use this code to finish verifying your account:</p>
                <p style="font-size:28px;font-weight:700;letter-spacing:6px;margin:20px 0;">${code}</p>
                <p>If you did not request this code, you can ignore this email.</p>
            </div>
        `
    })

    return {
        delivery: 'email',
        message: `Verification code sent to ${email}.`,
        verificationCode: ''
    }
}
