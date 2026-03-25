import React, { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import './ShippingInformation.css'
import { getActiveSession } from '../../utils/auth'
import { calculateOrderSummary } from '../../utils/orders'
import { formatPrice } from '../../utils/currency'
import { createShippingForm } from './shippingForm'
import ShippingSummaryPanel from './components/ShippingSummaryPanel'

export default function ShippingInformation({ cartItems, onPlaceOrder }) {
    const navigate = useNavigate()
    const activeSession = getActiveSession()
    const [form, setForm] = useState(() => createShippingForm(activeSession))
    const [status, setStatus] = useState({ type: '', text: '' })
    const [isSubmitting, setIsSubmitting] = useState(false)
    const summary = useMemo(() => calculateOrderSummary(cartItems), [cartItems])

    const handleChange = (event) => {
        const { name, value } = event.target

        setForm((currentForm) => ({
            ...currentForm,
            [name]: value
        }))
        setStatus({ type: '', text: '' })
    }

    const handleSubmit = async (event) => {
        event.preventDefault()

        if (cartItems.length === 0) {
            setStatus({ type: 'error', text: 'Your cart is empty. Add products before placing an order.' })
            return
        }

        setIsSubmitting(true)

        const preparedForm = Object.fromEntries(
            Object.entries(form).map(([key, value]) => [key, typeof value === 'string' ? value.trim() : value])
        )

        const result = await onPlaceOrder(preparedForm)

        if (!result.ok) {
            setStatus({ type: 'error', text: result.message })
            setIsSubmitting(false)
            return
        }

        navigate(`/Orders?highlight=${result.order.id}`, {
            replace: true
        })
    }

    if (cartItems.length === 0) {
        return (
            <section className='shipping-page'>
                <div className='shipping-empty-state'>
                    <h1>No items ready for shipping</h1>
                    <p>Add products to your cart first, then we can collect your shipping details.</p>
                    <div className='shipping-empty-actions'>
                        <Link to="/Home" className='shipping-link-btn'>Browse Products</Link>
                        <Link to="/Cart" className='shipping-outline-btn'>Return to Cart</Link>
                    </div>
                </div>
            </section>
        )
    }

    return (
        <section className='shipping-page'>
            <div className='shipping-shell'>
                <div className='shipping-heading'>
                    <div>
                        <p className='shipping-eyebrow'>Checkout Step 2</p>
                        <h1>Shipping information</h1>
                        <p className='shipping-subtitle'>
                            Enter the delivery details for this order. Once you submit, the order is saved and appears on the orders page.
                        </p>
                    </div>
                    <div className='shipping-mini-card'>
                        <span>Items</span>
                        <strong>{summary.itemCount}</strong>
                        <small>{formatPrice(summary.total)} total</small>
                    </div>
                </div>

                <div className='shipping-layout'>
                    <form className='shipping-form' onSubmit={handleSubmit}>
                        <div className='shipping-form-grid'>
                            <label className='shipping-field'>
                                <span>Full Name</span>
                                <input
                                    type="text"
                                    name="fullName"
                                    value={form.fullName}
                                    onChange={handleChange}
                                    placeholder='Enter your full name'
                                    required
                                />
                            </label>

                            <label className='shipping-field'>
                                <span>Email Address</span>
                                <input
                                    type="email"
                                    name="email"
                                    value={form.email}
                                    onChange={handleChange}
                                    placeholder='you@example.com'
                                    required
                                />
                            </label>

                            <label className='shipping-field'>
                                <span>Phone Number</span>
                                <input
                                    type="tel"
                                    name="phone"
                                    value={form.phone}
                                    onChange={handleChange}
                                    placeholder='Enter your phone number'
                                    required
                                />
                            </label>

                            <label className='shipping-field shipping-field-wide'>
                                <span>Address Line 1</span>
                                <input
                                    type="text"
                                    name="addressLine1"
                                    value={form.addressLine1}
                                    onChange={handleChange}
                                    placeholder='Street address'
                                    required
                                />
                            </label>

                            <label className='shipping-field shipping-field-wide'>
                                <span>Address Line 2</span>
                                <input
                                    type="text"
                                    name="addressLine2"
                                    value={form.addressLine2}
                                    onChange={handleChange}
                                    placeholder='Apartment, suite, or landmark (optional)'
                                />
                            </label>

                            <label className='shipping-field'>
                                <span>City</span>
                                <input
                                    type="text"
                                    name="city"
                                    value={form.city}
                                    onChange={handleChange}
                                    required
                                />
                            </label>

                            <label className='shipping-field'>
                                <span>State</span>
                                <input
                                    type="text"
                                    name="state"
                                    value={form.state}
                                    onChange={handleChange}
                                    required
                                />
                            </label>

                            <label className='shipping-field'>
                                <span>Postal Code</span>
                                <input
                                    type="text"
                                    name="postalCode"
                                    value={form.postalCode}
                                    onChange={handleChange}
                                    required
                                />
                            </label>

                            <label className='shipping-field'>
                                <span>Country</span>
                                <input
                                    type="text"
                                    name="country"
                                    value={form.country}
                                    onChange={handleChange}
                                    required
                                />
                            </label>

                            <label className='shipping-field shipping-field-wide'>
                                <span>Order Notes</span>
                                <textarea
                                    name="notes"
                                    value={form.notes}
                                    onChange={handleChange}
                                    rows="4"
                                    placeholder='Optional delivery notes or requests'
                                />
                            </label>
                        </div>

                        {status.text && (
                            <p className={`shipping-status ${status.type}`}>{status.text}</p>
                        )}

                        <div className='shipping-actions'>
                            <Link to="/Cart" className='shipping-outline-btn'>Back to Cart</Link>
                            <button type="submit" className='shipping-submit-btn' disabled={isSubmitting}>
                                {isSubmitting ? 'Placing Order...' : 'Submit Order'}
                            </button>
                        </div>
                    </form>

                    <ShippingSummaryPanel cartItems={cartItems} summary={summary} />
                </div>
            </div>
        </section>
    )
}
