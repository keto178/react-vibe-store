import React, { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import './Home.css'
import Header from '../../componantes/Header/Header'
import Card from '../Card/Card'
import CategoryListSection from './components/CategoryListSection'
import AddToCartToast from './components/AddToCartToast'

export default function Home({ categories = [], products, onAddToCart }) {
    const navigate = useNavigate()
    const [searchParams, setSearchParams] = useSearchParams()
    const productsSectionRef = useRef(null)
    const [selectedCategoryId, setSelectedCategoryId] = useState(null)
    const [cartToast, setCartToast] = useState(null)
    const categoriesCount = categories.length
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

    const scrollToProducts = () => {
        productsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
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
            if (result?.requiresAuth) {
                navigate('/Login')
            }

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
                productsCount={products.length}
                categoriesCount={categoriesCount}
                hasProducts={products.length > 0}
                onBrowseProducts={scrollToProducts}
            />
            <section className='home-categories-wrapper'>
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
                        <span className='products-count'>{filteredProducts.length} products</span>
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

                {filteredProducts.length > 0 ? (
                    <div className='products-grid'>
                        {filteredProducts.map((product) => (
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
