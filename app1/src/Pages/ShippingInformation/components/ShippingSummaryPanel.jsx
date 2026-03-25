import React from 'react'
import { getDiscountedPrice } from '../../../utils/orders'
import { formatPrice } from '../../../utils/currency'

const EMPTY_SUMMARY = {
    itemCount: 0,
    total: 0
}

export default function ShippingSummaryPanel({ cartItems = [], summary = EMPTY_SUMMARY }) {
    return (
        <aside className='shipping-summary'>
            <div className='shipping-summary-card'>
                <span className='shipping-summary-label'>Order Summary</span>
                <h2>{formatPrice(summary.total)}</h2>
                <p>{summary.itemCount} items ready to ship.</p>
            </div>

            <div className='shipping-items-list'>
                {cartItems.map((item) => {
                    const finalPrice = getDiscountedPrice(item)

                    return (
                        <article key={item.id} className='shipping-item'>
                            <img src={item.image} alt={item.name} />
                            <div>
                                <strong>{item.name}</strong>
                                <p>{item.quantity} x {formatPrice(finalPrice)}</p>
                                <small className='shipping-item-color-meta'>
                                    <span
                                        className='shipping-item-color-swatch'
                                        style={{ backgroundColor: item.selectedColor }}
                                        aria-hidden='true'
                                    />
                                    Selected color
                                </small>
                            </div>
                        </article>
                    )
                })}
            </div>
        </aside>
    )
}
