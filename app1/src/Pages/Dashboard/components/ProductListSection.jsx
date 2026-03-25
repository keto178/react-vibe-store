import React from 'react'
import Card from '../../Card/Card'

export default function ProductListSection({ products = [], onEdit, onDelete }) {
    return (
        <section className='dashboard-products'>
            <div className='dashboard-products-header'>
                <div>
                    <p className='dashboard-badge'>Product List</p>
                    <h2>Manage your saved products</h2>
                </div>
                <span className='dashboard-products-count'>{products.length} items</span>
            </div>

            {products.length > 0 ? (
                <div className='dashboard-products-grid'>
                    {products.map((product) => (
                        <Card
                            key={product.id}
                            product={product}
                            showAddButton={false}
                            footerActions={
                                <div className='dashboard-card-actions'>
                                    <button
                                        type="button"
                                        className='dashboard-card-btn edit'
                                        onClick={() => onEdit(product)}
                                    >
                                        Edit
                                    </button>
                                    <button
                                        type="button"
                                        className='dashboard-card-btn delete'
                                        onClick={() => onDelete(product.id, product.name)}
                                    >
                                        Delete
                                    </button>
                                </div>
                            }
                        />
                    ))}
                </div>
            ) : (
                <div className='dashboard-empty-state'>
                    <h3>No products yet</h3>
                    <p>Once you add a product and assign it to a category, it will appear here.</p>
                </div>
            )}
        </section>
    )
}
