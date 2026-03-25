import React, { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import './Orders.css'
import { getActiveSession, isDashboardOwner } from '../../utils/auth'
import { formatPrice } from '../../utils/currency'
import OrderCard from './components/OrderCard'

export default function Orders({ orders, onMarkOrdersAsSeen, onUpdateOrderStatus, onDeleteOrder }) {
    const activeSession = getActiveSession()
    const isAdmin = isDashboardOwner(activeSession)
    const [searchParams] = useSearchParams()
    const highlightedOrderId = searchParams.get('highlight') || ''
    const [reviewedOrdersCount] = useState(() => (
        isAdmin ? orders.filter((order) => order.isNew).length : 0
    ))
    const hasUnreadOrders = orders.some((order) => order.isNew)
    const visibleOrders = useMemo(() => orders, [orders])
    const highlightedOrder = visibleOrders.find((order) => order.id === highlightedOrderId) || null

    useEffect(() => {
        if (isAdmin && hasUnreadOrders) {
            onMarkOrdersAsSeen()
        }
    }, [hasUnreadOrders, isAdmin, onMarkOrdersAsSeen])

    if (visibleOrders.length === 0) {
        return (
            <section className='orders-page'>
                <div className='orders-empty-state'>
                    <p className='orders-eyebrow'>{isAdmin ? 'Admin Orders' : 'Your Orders'}</p>
                    <h1>No orders yet</h1>
                    <p>
                        {isAdmin
                            ? 'New orders will appear here as soon as customers complete checkout.'
                            : 'Place an order from the cart and it will appear here with its shipping details and total.'}
                    </p>
                    <Link to="/Home" className='orders-primary-link'>Go to Home</Link>
                </div>
            </section>
        )
    }

    return (
        <section className='orders-page'>
            <div className='orders-header'>
                <div>
                    <p className='orders-eyebrow'>{isAdmin ? 'Admin Orders' : 'Order Confirmation'}</p>
                    <h1>{isAdmin ? 'Incoming orders' : 'Your orders'}</h1>
                    <p className='orders-subtitle'>
                        {isAdmin
                            ? 'Review every order, customer shipping detail, and email delivery status from one place.'
                            : 'This page shows the latest order details along with your saved order history.'}
                    </p>
                </div>
                <div className='orders-header-card'>
                    <span>Total Orders</span>
                    <strong>{visibleOrders.length}</strong>
                    {isAdmin && reviewedOrdersCount > 0 && (
                        <small>{reviewedOrdersCount} new order{reviewedOrdersCount === 1 ? '' : 's'} marked as reviewed.</small>
                    )}
                </div>
            </div>

            {highlightedOrder && (
                <div className='orders-highlight-banner'>
                    <strong>Order {highlightedOrder.id} was placed successfully.</strong>
                    <span>
                        Shipping to {highlightedOrder.customer.fullName} at {formatPrice(highlightedOrder.summary.total)}.
                    </span>
                </div>
            )}

            <div className='orders-list'>
                {visibleOrders.map((order) => (
                    <OrderCard
                        key={order.id}
                        order={order}
                        highlightedOrderId={highlightedOrderId}
                        isAdmin={isAdmin}
                        onUpdateOrderStatus={onUpdateOrderStatus}
                        onDeleteOrder={onDeleteOrder}
                    />
                ))}
            </div>
        </section>
    )
}
