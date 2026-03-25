import React from 'react'
import { getDiscountedPrice } from '../../../utils/orders'
import { formatPrice } from '../../../utils/currency'

export default function CartItemCard({ item, onUpdateCartQuantity, onRemoveFromCart }) {
    const discount = Number(item.discount) || 0
    const finalPrice = getDiscountedPrice(item)

    return (
        <article className='cart-item-card'>
            <img className='cart-item-image' src={item.image} alt={item.name} />
            <div className='cart-item-content'>
                <div className='cart-item-top'>
                    <div>
                        <p className='cart-item-category'>{item.category}</p>
                        <h2>{item.name}</h2>
                    </div>
                    <div className='cart-item-price-group'>
                        {discount > 0 && (
                            <strong className='cart-item-price-old'>{formatPrice(item.price)}</strong>
                        )}
                        <strong className='cart-item-price'>{formatPrice(finalPrice)}</strong>
                    </div>
                </div>
                <p className='cart-item-description'>{item.description}</p>
                <div className='cart-item-meta'>
                    <span className='cart-item-chip'>{item.type}</span>
                    {discount > 0 && <span className='cart-item-chip'>{discount}% Off</span>}
                    <span className='cart-item-chip'>
                        <span
                            className='cart-item-color'
                            style={{ backgroundColor: item.selectedColor }}
                            aria-hidden="true"
                        />
                        Selected Color
                    </span>
                </div>
                <div className='cart-item-actions'>
                    <div className='cart-quantity'>
                        <button type="button" onClick={() => onUpdateCartQuantity(item.id, item.quantity - 1)}>-</button>
                        <span>{item.quantity}</span>
                        <button type="button" onClick={() => onUpdateCartQuantity(item.id, item.quantity + 1)}>+</button>
                    </div>
                    <button
                        type="button"
                        className='cart-remove'
                        onClick={() => onRemoveFromCart(item.id)}
                    >
                        Remove
                    </button>
                </div>
            </div>
        </article>
    )
}
