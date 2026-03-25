import React from 'react'

export default function CategoryListSection({ title, subtitle, categories = [], selectedCategoryId, onSelectCategory }) {
    return (
        <div className='home-category-list'>
            <div className='home-category-header'>
                <div>
                    <p className='products-eyebrow'>{subtitle}</p>
                    <h2>{title}</h2>
                </div>
                <span className='products-count'>{categories.length} categories</span>
            </div>

            {categories.length > 0 ? (
                <div className='home-category-grid'>
                    {categories.map((category) => (
                        <button
                            key={category.id}
                            type="button"
                            className={`home-category-card ${selectedCategoryId === category.id ? 'active' : ''}`}
                            onClick={() => onSelectCategory(category)}
                        >
                            <div className='home-category-image-wrap'>
                                <img src={category.image} alt={category.name} className='home-category-image' />
                            </div>
                            <strong>{category.name}</strong>
                        </button>
                    ))}
                </div>
            ) : (
                <div className='products-empty-state'>
                    <h3>No categories yet</h3>
                    <p>This list is still empty. Add categories from the dashboard and they will appear here.</p>
                </div>
            )}
        </div>
    )
}
