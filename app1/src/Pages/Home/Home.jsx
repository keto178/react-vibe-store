import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import './Home.css'
import Header from '../../componantes/Header/Header'
import Card from '../Card/Card'
import CategoryListSection from './components/CategoryListSection'
import AddToCartToast from './components/AddToCartToast'

export default function Home({ categories = [], products = [], onAddToCart }) {
    const [searchParams, setSearchParams] = useSearchParams()
    const categorySectionRef = useRef(null)
    const productsSectionRef = useRef(null)
    const [selectedCategoryId, setSelectedCategoryId] = useState(null)
    const [cartToast, setCartToast] = useState(null)
    const [mobileSortOrder, setMobileSortOrder] = useState('featured')
    const [mobileViewMode, setMobileViewMode] = useState('grid')
    const activeSearchTerm = searchParams.get('search')?.trim() || ''
    const normalizedSearchTerm = activeSearchTerm.toLowerCase()
    const hasSearchTerm = normalizedSearchTerm.length > 0
    const deviceCategories = categories.filter((category) => (category.group || 'Device') === 'Device')
    const liquidCategories = categories.filter((category) => (category.group || 'Device') === 'Liquid')
    const selectedCategory = categories.find((category) => category.id === selectedCategoryId) || null
    const categoryFilteredProducts = selectedCategory
        ? products.filter((product) => (
            product.categoryId === selectedCategory.id ||
            product.category === selectedCategory.name
        ))
        : products
    const filteredProducts = categoryFilteredProducts.filter((product) => {
        if (!hasSearchTerm) {
            return true
        }

        return [
            product.name,
            product.description,
            product.category,
            product.type
        ].some((value) => String(value || '').toLowerCase().includes(normalizedSearchTerm))
    })

    const sortedProducts = useMemo(() => {
        const nextProducts = [...filteredProducts]

        if (mobileSortOrder === 'price-low-high') {
            nextProducts.sort((leftProduct, rightProduct) => Number(leftProduct.price || 0) - Number(rightProduct.price || 0))
        } else if (mobileSortOrder === 'price-high-low') {
            nextProducts.sort((leftProduct, rightProduct) => Number(rightProduct.price || 0) - Number(leftProduct.price || 0))
        } else if (mobileSortOrder === 'name-a-z') {
            nextProducts.sort((leftProduct, rightProduct) => String(leftProduct.name || '').localeCompare(String(rightProduct.name || '')))
        }

        return nextProducts
    }, [filteredProducts, mobileSortOrder])

    const scrollToProducts = () => {
        productsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }

    const scrollToCategories = () => {
        categorySectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }

    const handleSelectCategory = (category) => {
        setSelectedCategoryId((currentCategoryId) => (
            currentCategoryId === category.id ? null : category.id
        ))
        scrollToProducts()
    }

    const clearCategoryFilter = () => {
        setSelectedCategoryId(null)
    }

    const clearSearchFilter = () => {
        const nextSearchParams = new URLSearchParams(searchParams)
        nextSearchParams.delete('search')
        setSearchParams(nextSearchParams)
    }

    const handleAddToCartFromHome = async (product, selectedColor) => {
        const result = await onAddToCart(product, selectedColor)

        if (!result?.ok) {
            return result
        }

        setCartToast({
            id: `${product.id}-${Date.now()}`,
            product,
            selectedColor
        })

        return result
    }

    useEffect(() => {
        if (!cartToast) {
            return undefined
        }

        const timeoutId = window.setTimeout(() => {
            setCartToast(null)
        }, 3200)

        return () => window.clearTimeout(timeoutId)
    }, [cartToast])

    useEffect(() => {
        if (!hasSearchTerm) {
            return undefined
        }

        const frameId = window.requestAnimationFrame(() => {
            productsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        })

        return () => window.cancelAnimationFrame(frameId)
    }, [hasSearchTerm, activeSearchTerm])

    return (
        <div className='home-page'>
            <AddToCartToast toast={cartToast} onClose={() => setCartToast(null)} />
            <Header
                hasProducts={products.length > 0}
                onBrowseProducts={scrollToProducts}
            />
            <section ref={categorySectionRef} className='home-categories-wrapper'>
                <CategoryListSection
                    title='Device Categories'
                    subtitle='Device list'
                    categories={deviceCategories}
                    selectedCategoryId={selectedCategoryId || ''}
                    onSelectCategory={handleSelectCategory}
                />
                <CategoryListSection
                    title='Liquid Categories'
                    subtitle='Liquid list'
                    categories={liquidCategories}
                    selectedCategoryId={selectedCategoryId || ''}
                    onSelectCategory={handleSelectCategory}
                />
            </section>
            <section ref={productsSectionRef} className='products-section'>
                <div className='products-section-heading'>
                    <div>
                        <p className='products-eyebrow'>Admin inventory</p>
                        <h2>
                            {hasSearchTerm
                                ? `Results for "${activeSearchTerm}"`
                                : selectedCategory
                                    ? `${selectedCategory.name} products`
                                    : 'Fresh arrivals on the home page'}
                        </h2>
                        <p className='products-subtitle'>
                            {hasSearchTerm && selectedCategory
                                ? `Showing products in ${selectedCategory.name} that match your search keyword.`
                                : hasSearchTerm
                                    ? 'Search matches are checked against the product name, description, category, and type.'
                                    : selectedCategory
                                ? `Showing only the products linked to ${selectedCategory.name}.`
                                : 'Every product added from the admin dashboard appears here with full details, image, pricing, and category data.'}
                        </p>
                    </div>
                    <div className='products-heading-actions'>
                        <span className='products-count'>{sortedProducts.length} products</span>
                        {hasSearchTerm && (
                            <span className='products-search-tag'>Search: {activeSearchTerm}</span>
                        )}
                        {hasSearchTerm && (
                            <button type="button" className='products-clear-filter' onClick={clearSearchFilter}>
                                Clear Search
                            </button>
                        )}
                        {selectedCategory && (
                            <button type="button" className='products-clear-filter' onClick={clearCategoryFilter}>
                                Show All
                            </button>
                        )}
                    </div>
                </div>

                <div className='products-mobile-toolbar' aria-label='Products controls'>
                    <button type="button" className='mobile-toolbar-filter' onClick={scrollToCategories}>
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                            <path d="M10 18H14V16H10V18ZM3 6V8H21V6H3ZM6 13H18V11H6V13Z" />
                        </svg>
                        <span>Filter</span>
                    </button>

                    <div className='mobile-view-toggle' role="group" aria-label="Change products view">
                        <button
                            type="button"
                            className={`mobile-view-option ${mobileViewMode === 'grid' ? 'active' : ''}`}
                            onClick={() => setMobileViewMode('grid')}
                            aria-label="Grid view"
                            title="Grid view"
                        >
                            <svg viewBox="0 0 24 24" aria-hidden="true">
                                <path d="M4 4H10V10H4V4ZM14 4H20V10H14V4ZM4 14H10V20H4V14ZM14 14H20V20H14V14Z" />
                            </svg>
                        </button>
                        <button
                            type="button"
                            className={`mobile-view-option ${mobileViewMode === 'compact' ? 'active' : ''}`}
                            onClick={() => setMobileViewMode('compact')}
                            aria-label="List view"
                            title="List view"
                        >
                            <svg viewBox="0 0 24 24" aria-hidden="true">
                                <path d="M3 6H7V10H3V6ZM9 6H21V10H9V6ZM3 14H7V18H3V14ZM9 14H21V18H9V14Z" />
                            </svg>
                        </button>
                    </div>

                    <label className='mobile-sort-group'>
                        <span>Sort</span>
                        <select value={mobileSortOrder} onChange={(event) => setMobileSortOrder(event.target.value)}>
                            <option value="featured">Featured</option>
                            <option value="price-low-high">Price Low</option>
                            <option value="price-high-low">Price High</option>
                            <option value="name-a-z">Name A-Z</option>
                        </select>
                    </label>
                </div>

                {sortedProducts.length > 0 ? (
                    <div className={`products-grid ${mobileViewMode === 'compact' ? 'products-grid-compact' : ''}`}>
                        {sortedProducts.map((product) => (
                            <Card key={product.id} product={product} onAddToCart={handleAddToCartFromHome} />
                        ))}
                    </div>
                ) : (
                    <div className='products-empty-state'>
                        <h3>
                            {hasSearchTerm
                                ? `No results for "${activeSearchTerm}"`
                                : selectedCategory
                                    ? 'No products in this category yet'
                                    : 'No products yet'}
                        </h3>
                        <p>
                            {hasSearchTerm && selectedCategory
                                ? `Try another keyword or clear the ${selectedCategory.name} filter to browse more products.`
                                : hasSearchTerm
                                    ? 'Try another product name, category, or keyword from the navbar search.'
                                    : selectedCategory
                                ? `There are no saved products linked to ${selectedCategory.name} right now.`
                                : 'Once the admin adds a vape device or liquid from the dashboard, it will appear here as a card.'}
                        </p>
                    </div>
                )}
            </section>
        </div>
    )
}
