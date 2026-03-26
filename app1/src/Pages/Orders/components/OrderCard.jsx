import React, { useState } from 'react'
import { formatShippingAddress, getDiscountedPrice } from '../../../utils/orders'
import { formatPrice } from '../../../utils/currency'
import EmailStatus from './EmailStatus'

const ORDER_STATUSES = ['pending', 'processing', 'shipped', 'delivered', 'cancelled']

function formatStatusLabel(status) {
    return status.charAt(0).toUpperCase() + status.slice(1)
}

const EMPTY_ORDER_SUMMARY = {
    itemCount: 0,
    subtotal: 0,
    shippingFee: 0,
    total: 0
}

export default function OrderCard({ order = {}, highlightedOrderId, isAdmin, onUpdateOrderStatus, onDeleteOrder }) {
    const customer = order.customer || {}
    const summary = {
        ...EMPTY_ORDER_SUMMARY,
        ...(order.summary || {})
    }
    const items = Array.isArray(order.items) ? order.items : []
    const createdAtLabel = order.createdAt ? new Date(order.createdAt).toLocaleString() : 'Unknown date'
    const [selectedStatus, setSelectedStatus] = useState(order.status || 'pending')
    const [statusMessage, setStatusMessage] = useState('')

    const handleStatusUpdate = async () => {
        const result = await onUpdateOrderStatus(order.id, selectedStatus)

        setStatusMessage(result?.ok ? 'Order status updated.' : result?.message || '')
    }

    const handleDelete = async () => {
        const result = await onDeleteOrder(order.id)

        if (!result?.ok) {
            setStatusMessage(result?.message || 'Order could not be removed.')
        }
    }

    return (
        <article
            className={`order-card ${order.id === highlightedOrderId ? 'highlighted' : ''}`}
        >
            <div className='order-card-top'>
                <div>
                    <p className='order-card-label'>Order ID</p>
                    <h2>{order.id || 'Unknown order'}</h2>
                    <p className='order-card-date'>{createdAtLabel}</p>
                </div>
                <div className='order-card-actions'>
                    <div className='order-card-total'>
                        <span>Total</span>
                        <strong>{formatPrice(summary.total)}</strong>
                    </div>
                </div>
            </div>

            <div className='order-card-grid'>
                <section className='order-info-panel'>
                    <h3>Shipping details</h3>
                    <p><strong>Name:</strong> {customer.fullName || 'Not provided'}</p>
                    <p><strong>Email:</strong> {customer.email || 'Not provided'}</p>
                    <p><strong>Phone:</strong> {customer.phone || 'Not provided'}</p>
                    <p><strong>Address:</strong> {formatShippingAddress(customer) || 'Not provided'}</p>
                    {customer.notes && <p><strong>Notes:</strong> {customer.notes}</p>}
                </section>

                <section className='order-info-panel'>
                    <h3>Order summary</h3>
                    <p><strong>Items:</strong> {summary.itemCount}</p>
                    <p><strong>Subtotal:</strong> {formatPrice(summary.subtotal)}</p>
                    <p><strong>Shipping:</strong> {formatPrice(summary.shippingFee)}</p>
                    <p><strong>Total:</strong> {formatPrice(summary.total)}</p>
                </section>

                <section className='order-info-panel'>
                    <h3>Order status</h3>
                    <p><strong>Current:</strong> {formatStatusLabel(order.status || 'pending')}</p>
                    {isAdmin && (
                        <>
                            <select
                                value={selectedStatus}
                                onChange={(event) => setSelectedStatus(event.target.value)}
                            >
                                {ORDER_STATUSES.map((status) => (
                                    <option key={status} value={status}>
                                        {formatStatusLabel(status)}
                                    </option>
                                ))}
                            </select>
                            <button
                                type='button'
                                className='order-done-button'
                                onClick={handleStatusUpdate}
                            >
                                Update Status
                            </button>
                        </>
                    )}
                    {statusMessage && <p>{statusMessage}</p>}
                </section>
            </div>

            <div className='order-items-list'>
                {items.map((item) => (
                    <div key={item.id} className='order-item-row'>
                        <img
                            src={item.image}
                            alt={item.name}
                            loading="lazy"
                            decoding="async"
                        />
                        <div className='order-item-copy'>
                            <strong>{item.name}</strong>
                            <span>{item.category} - {item.type}</span>
                            <small className='order-item-color-meta'>
                                <span
                                    className='order-item-color-swatch'
                                    style={{ backgroundColor: item.selectedColor }}
                                    aria-hidden='true'
                                />
                                Color: {item.selectedColor}
                            </small>
                        </div>
                        <div className='order-item-price'>
                            <span>{item.quantity} x {formatPrice(getDiscountedPrice(item))}</span>
                            <strong>{formatPrice(getDiscountedPrice(item) * item.quantity)}</strong>
                        </div>
                    </div>
                ))}
            </div>

            {isAdmin && <EmailStatus emailNotification={order.emailNotification} />}

            {isAdmin && (
                <button
                    type='button'
                    className='order-done-button'
                    onClick={handleDelete}
                >
                    Remove Order
                </button>
            )}
        </article>
    )
}
