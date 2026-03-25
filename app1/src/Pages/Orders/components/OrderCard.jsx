import React, { useState } from 'react'
import { formatShippingAddress, getDiscountedPrice } from '../../../utils/orders'
import { formatPrice } from '../../../utils/currency'
import EmailStatus from './EmailStatus'

const ORDER_STATUSES = ['pending', 'processing', 'shipped', 'delivered', 'cancelled']

function formatStatusLabel(status) {
    return status.charAt(0).toUpperCase() + status.slice(1)
}

export default function OrderCard({ order, highlightedOrderId, isAdmin, onUpdateOrderStatus, onDeleteOrder }) {
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
                    <h2>{order.id}</h2>
                    <p className='order-card-date'>{new Date(order.createdAt).toLocaleString()}</p>
                </div>
                <div className='order-card-actions'>
                    <div className='order-card-total'>
                        <span>Total</span>
                        <strong>{formatPrice(order.summary.total)}</strong>
                    </div>
                </div>
            </div>

            <div className='order-card-grid'>
                <section className='order-info-panel'>
                    <h3>Shipping details</h3>
                    <p><strong>Name:</strong> {order.customer.fullName}</p>
                    <p><strong>Email:</strong> {order.customer.email}</p>
                    <p><strong>Phone:</strong> {order.customer.phone}</p>
                    <p><strong>Address:</strong> {formatShippingAddress(order.customer)}</p>
                    {order.customer.notes && <p><strong>Notes:</strong> {order.customer.notes}</p>}
                </section>

                <section className='order-info-panel'>
                    <h3>Order summary</h3>
                    <p><strong>Items:</strong> {order.summary.itemCount}</p>
                    <p><strong>Subtotal:</strong> {formatPrice(order.summary.subtotal)}</p>
                    <p><strong>Shipping:</strong> {formatPrice(order.summary.shippingFee)}</p>
                    <p><strong>Total:</strong> {formatPrice(order.summary.total)}</p>
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
                {order.items.map((item) => (
                    <div key={item.id} className='order-item-row'>
                        <img src={item.image} alt={item.name} />
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
