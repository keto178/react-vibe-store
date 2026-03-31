import React, { useEffect, useMemo, useState } from 'react'
import './ProductCard.css'
import { formatPrice } from '../../utils/currency'
import { formatNicotineLevel, sanitizeNicotineLevels } from '../../utils/nicotine'

export default function ProductCard({ product, showAddButton = true, footerActions = null, onAddToCart = null }) {
    const [isAdded, setIsAdded] = useState(false)
    const rating = Math.max(0, Math.min(5, Number(product.rating ?? 4.5)))
    const discount = Number(product.discount) || 0
    const finalPrice = discount > 0
        ? product.price - (product.price * discount / 100)
        : product.price
    const availableColors = Array.isArray(product.colors) && product.colors.length > 0
        ? product.colors
        : [product.color || '#5dc0ff']
    const nicotineLevels = sanitizeNicotineLevels(product.nicotineLevels)
    const showNicotineLevels = product.type === 'Liquid' && nicotineLevels.length > 0
    const [selectedColor, setSelectedColor] = useState(availableColors[0])
    const ratingStars = useMemo(
        () => Array.from({ length: 5 }, (_, index) => index < Math.round(rating)),
        [rating]
    )
    const metaItems = [
        product.type && product.type !== 'Product' ? product.type : null,
        discount > 0 ? `Discount ${discount}%` : null
    ].filter(Boolean)

    const handleAddProduct = async () => {
        const result = onAddToCart
            ? await onAddToCart(product, selectedColor)
            : { ok: true }

        if (result?.ok === false) {
            return
        }

        setIsAdded(true)
    }

    useEffect(() => {
        if (!isAdded) {
            return undefined
        }

        const timeoutId = window.setTimeout(() => {
            setIsAdded(false)
        }, 2800)

        return () => window.clearTimeout(timeoutId)
    }, [isAdded])

    return (
        <article className='product-card'>
            <div className='product-card-image-wrap'>
                <img
                    className='product-card-image'
                    src={product.image}
                    alt={product.name}
                    loading="lazy"
                    decoding="async"
                />
                <span className='product-card-category'>{product.category}</span>
            </div>

            <div className='product-card-content'>
                <div className='product-card-top'>
                    <h3>{product.name}</h3>
                    <div className='product-card-rating' aria-label={`Rated ${rating} out of 5`}>
                        <div className='product-card-stars'>
                            {ratingStars.map((isFilled, index) => (
                                <span key={index} className={isFilled ? 'filled' : ''}>{'\u2605'}</span>
                            ))}
                        </div>
                        <strong>{rating.toFixed(1)}</strong>
                    </div>
                    <p>{product.description}</p>
                </div>

                {metaItems.length > 0 && (
                    <div className='product-card-meta'>
                        {metaItems.map((item) => (
                            <span key={item} className='product-card-chip'>{item}</span>
                        ))}
                    </div>
                )}

                <div className='product-card-colors'>
                    <span className='product-card-colors-label'>Colors</span>
                    <div className='product-card-colors-list'>
                        {availableColors.map((color) => (
                            <button
                                key={color}
                                type="button"
                                className={`product-card-color-option ${selectedColor === color ? 'active' : ''}`}
                                onClick={() => setSelectedColor(color)}
                                aria-label={`Select color ${color}`}
                                title={color}
                            >
                                <span
                                    className='product-color-swatch'
                                    style={{ backgroundColor: color }}
                                    aria-hidden="true"
                                />
                            </button>
                        ))}
                    </div>
                </div>

                {showNicotineLevels && (
                    <div className='product-card-nicotine'>
                        <span className='product-card-nicotine-label'>Nicotine Available</span>
                        <div className='product-card-nicotine-list'>
                            {nicotineLevels.map((level) => (
                                <span key={level} className='product-card-nicotine-chip'>
                                    {formatNicotineLevel(level)}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                <div className='product-card-footer'>
                    <div className='product-card-price-block'>
                        <span>{discount > 0 ? `Price after ${discount}% off` : 'Price'}</span>
                        <div className='product-card-price-values'>
                            {discount > 0 && (
                                <strong className='product-card-price-old'>{formatPrice(product.price)}</strong>
                            )}
                            <strong className='product-card-price-current'>{formatPrice(finalPrice)}</strong>
                        </div>
                    </div>
                    {footerActions || (showAddButton && (
                        <button
                            type="button"
                            className={`product-card-button ${isAdded ? 'added' : ''}`}
                            onClick={handleAddProduct}
                        >
                            {isAdded ? 'Added to Cart' : 'Add to Cart'}
                        </button>
                    ))}
                </div>
            </div>
        </article>
    )
}
