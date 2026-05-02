import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import './CartPage.css'
import { getDiscountedPrice } from '../../utils/orders'
import { formatPrice } from '../../utils/currency'
import CartItemCard from './components/CartItemCard'

export default function CartPage({ activeSession, cartItems = [], onUpdateCartQuantity, onRemoveFromCart }) {
    const navigate = useNavigate()
    const total = cartItems.reduce((sum, item) => {
        return sum + (getDiscountedPrice(item) * item.quantity)
    }, 0)
    const isGuest = !activeSession

    const handleContinueToShipping = () => {
        navigate('/Shipping')
    }

    return (
        <section className='cart-page'>
            <div className='cart-header'>
                <div>
                    <p className='cart-badge-label'>Your Cart</p>
                    <h1>Shopping cart</h1>
                    <p className='cart-description'>Review the products you added, adjust quantities, or remove items before checkout.</p>
                </div>
                <div className='cart-summary-card'>
                    <span>Total items</span>
                    <strong>{cartItems.reduce((sum, item) => sum + item.quantity, 0)}</strong>
                    <small>{formatPrice(total)} total</small>
                    {isGuest && <small>Guest cart is saved on this device.</small>}
                </div>
            </div>

            {cartItems.length > 0 ? (
                <div className='cart-layout'>
                    <div className='cart-items'>
                        {cartItems.map((item) => (
                            <CartItemCard
                                key={item.id}
                                item={item}
                                onUpdateCartQuantity={onUpdateCartQuantity}
                                onRemoveFromCart={onRemoveFromCart}
                            />
                        ))}
                    </div>

                    <aside className='cart-total-card'>
                        <span>Order Summary</span>
                        <h3>{formatPrice(total)}</h3>
                        <p>{cartItems.reduce((sum, item) => sum + item.quantity, 0)} items in your cart.</p>
                        <button
                            type="button"
                            className='cart-checkout-btn'
                            onClick={handleContinueToShipping}
                        >
                            {isGuest ? 'Checkout as Guest' : 'Continue to Shipping'}
                        </button>
                    </aside>
                </div>
            ) : (
                <div className='cart-empty-state'>
                    <h2>Your cart is empty.</h2>
                    <p>Add products from the Home page and they will appear here.</p>
                    <Link to="/Home" className='cart-return-home'>Return to Home</Link>
                </div>
            )}
        </section>
    )
}
