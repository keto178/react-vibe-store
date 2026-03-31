import React, { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import './ShippingPage.css'
import { calculateOrderSummary } from '../../utils/orders'
import { formatPrice } from '../../utils/currency'
import { createShippingForm } from './shippingForm'
import ShippingSummaryPanel from './components/ShippingSummaryPanel'

export default function ShippingPage({ activeSession, cartItems = [], onPlaceOrder }) {
    const navigate = useNavigate()
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
            setStatus({ type: 'error', text: 'السلة فارغة. أضف منتجات أولاً قبل تأكيد الطلب.' })
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
                    <h1>لا توجد منتجات للشحن</h1>
                    <p>أضف المنتجات إلى السلة أولاً ثم أكمل بيانات الشحن.</p>
                    <div className='shipping-empty-actions'>
                        <Link to="/Home" className='shipping-link-btn'>تصفح المنتجات</Link>
                        <Link to="/Cart" className='shipping-outline-btn'>العودة إلى السلة</Link>
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
                        <p className='shipping-eyebrow'>الخطوة 2 من الدفع</p>
                        <h1>معلومات الشحن</h1>
                        <p className='shipping-subtitle'>
                            أدخل بيانات الاستلام بشكل بسيط، ثم اضغط تأكيد الطلب.
                        </p>
                    </div>
                    <div className='shipping-mini-card'>
                        <span>عدد المنتجات</span>
                        <strong>{summary.itemCount}</strong>
                        <small>الإجمالي: {formatPrice(summary.total)}</small>
                    </div>
                </div>

                <div className='shipping-layout'>
                    <form className='shipping-form' onSubmit={handleSubmit}>
                        <div className='shipping-form-grid'>
                            <label className='shipping-field'>
                                <span>الاسم بالكامل</span>
                                <input
                                    type="text"
                                    name="fullName"
                                    value={form.fullName}
                                    onChange={handleChange}
                                    placeholder='اكتب الاسم بالكامل'
                                    required
                                />
                            </label>

                            <label className='shipping-field'>
                                <span>البريد الإلكتروني</span>
                                <input
                                    type="email"
                                    name="email"
                                    value={form.email}
                                    onChange={handleChange}
                                    placeholder='example@email.com'
                                    required
                                />
                            </label>

                            <label className='shipping-field'>
                                <span>رقم الهاتف</span>
                                <input
                                    type="tel"
                                    name="phone"
                                    value={form.phone}
                                    onChange={handleChange}
                                    placeholder='اكتب رقم الهاتف'
                                    required
                                />
                            </label>

                            <label className='shipping-field shipping-field-wide'>
                                <span>العنوان</span>
                                <input
                                    type="text"
                                    name="addressLine1"
                                    value={form.addressLine1}
                                    onChange={handleChange}
                                    placeholder='الشارع واسم المنطقة'
                                    required
                                />
                            </label>

                            <label className='shipping-field shipping-field-wide'>
                                <span>تفاصيل إضافية (اختياري)</span>
                                <input
                                    type="text"
                                    name="addressLine2"
                                    value={form.addressLine2}
                                    onChange={handleChange}
                                    placeholder='رقم شقة أو علامة مميزة'
                                />
                            </label>

                            <label className='shipping-field'>
                                <span>المدينة</span>
                                <input
                                    type="text"
                                    name="city"
                                    value={form.city}
                                    onChange={handleChange}
                                    required
                                />
                            </label>

                            <label className='shipping-field'>
                                <span>المحافظة</span>
                                <input
                                    type="text"
                                    name="state"
                                    value={form.state}
                                    onChange={handleChange}
                                    required
                                />
                            </label>

                            <label className='shipping-field'>
                                <span>الرقم البريدي</span>
                                <input
                                    type="text"
                                    name="postalCode"
                                    value={form.postalCode}
                                    onChange={handleChange}
                                    required
                                />
                            </label>

                            <label className='shipping-field'>
                                <span>البلد</span>
                                <input
                                    type="text"
                                    name="country"
                                    value={form.country}
                                    readOnly
                                    required
                                />
                            </label>

                            <label className='shipping-field shipping-field-wide'>
                                <span>ملاحظات الطلب (اختياري)</span>
                                <textarea
                                    name="notes"
                                    value={form.notes}
                                    onChange={handleChange}
                                    rows="4"
                                    placeholder='أي ملاحظات خاصة بالتوصيل'
                                />
                            </label>
                        </div>

                        {status.text && (
                            <p className={`shipping-status ${status.type}`}>{status.text}</p>
                        )}

                        <div className='shipping-actions'>
                            <Link to="/Cart" className='shipping-outline-btn'>رجوع للسلة</Link>
                            <button type="submit" className='shipping-submit-btn' disabled={isSubmitting}>
                                {isSubmitting ? 'جاري تأكيد الطلب...' : 'تأكيد الطلب'}
                            </button>
                        </div>
                    </form>

                    <ShippingSummaryPanel cartItems={cartItems} summary={summary} />
                </div>
            </div>
        </section>
    )
}
