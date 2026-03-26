import React from 'react'
import { Link } from 'react-router-dom'

export default function AddToCartToast({ toast, onClose }) {
    if (!toast) {
        return null
    }

    const { product, selectedColor } = toast

    return (
        <div className='add-cart-toast' role='status' aria-live='polite'>
            <div className='add-cart-toast-media'>
                <img src={product.image} alt={product.name} loading="lazy" decoding="async" />
            </div>

            <div className='add-cart-toast-body'>
                <p className='add-cart-toast-eyebrow'>Added to cart</p>
                <strong>{product.name}</strong>
                <div className='add-cart-toast-meta'>
                    <span>{product.category}</span>
                    <span className='add-cart-toast-color'>
                        <span
                            className='add-cart-toast-swatch'
                            style={{ backgroundColor: selectedColor }}
                            aria-hidden='true'
                        />
                        Selected color
                    </span>
                </div>
            </div>

            <div className='add-cart-toast-actions'>
                <Link to="/Cart" className='add-cart-toast-link'>
                    Go to Cart
                </Link>
                <button type="button" className='add-cart-toast-close' onClick={onClose}>
                    Close
                </button>
            </div>
        </div>
    )
}
