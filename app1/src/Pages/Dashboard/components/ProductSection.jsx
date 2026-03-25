import React from 'react'
import { formatNicotineLevel, MAX_NICOTINE_LEVELS, NICOTINE_OPTIONS } from '../../../utils/nicotine'

const EMPTY_PRODUCT_FORM = {
    name: '',
    description: '',
    price: '',
    discount: '',
    categoryId: '',
    colorInput: '#5dc0ff',
    colors: ['#5dc0ff'],
    nicotineLevels: [],
    existingImage: ''
}

const EMPTY_STATUS = {
    type: '',
    text: ''
}

export default function ProductSection({
    categories = [],
    sectionRef,
    form = EMPTY_PRODUCT_FORM,
    status = EMPTY_STATUS,
    isSaving,
    isEditing,
    imageInputRef,
    onFieldChange,
    onColorInputChange,
    onAddColor,
    onRemoveColor,
    onToggleNicotineLevel,
    onImageChange,
    onSubmit,
    onReset
}) {
    const selectedCategory = categories.find((category) => category.id === form.categoryId) || null
    const isLiquidProduct = (selectedCategory?.group || 'Device') === 'Liquid'

    return (
        <section ref={sectionRef} className='dashboard-panel'>
            <div className='dashboard-panel-heading'>
                <div>
                    <p className='dashboard-badge'>Add Products</p>
                    <h2>Add products to a category</h2>
                </div>
                <span className='dashboard-products-count'>{isEditing ? 'Editing Product' : 'New Product'}</span>
            </div>

            {categories.length > 0 ? (
                <form className='dashboard-form' onSubmit={onSubmit}>
                    <label className='dashboard-field'>
                        <span>Product Name</span>
                        <input
                            type="text"
                            name="name"
                            value={form.name}
                            onChange={onFieldChange}
                            placeholder='Enter product name'
                            required
                        />
                    </label>

                    <label className='dashboard-field'>
                        <span>Category</span>
                        <select
                            name="categoryId"
                            value={form.categoryId}
                            onChange={onFieldChange}
                            required
                        >
                            {categories.map((category) => (
                                <option key={category.id} value={category.id}>
                                    {category.name} ({category.group})
                                </option>
                            ))}
                        </select>
                    </label>

                    <label className='dashboard-field dashboard-field-full'>
                        <span>Product Description</span>
                        <textarea
                            name="description"
                            value={form.description}
                            onChange={onFieldChange}
                            placeholder='Enter product description'
                            rows="5"
                            required
                        />
                    </label>

                    <label className='dashboard-field'>
                        <span>Price</span>
                        <input
                            type="number"
                            name="price"
                            value={form.price}
                            onChange={onFieldChange}
                            placeholder="0.00"
                            min="0"
                            step="0.01"
                            required
                        />
                    </label>

                    <label className='dashboard-field'>
                        <span>Discount</span>
                        <input
                            type="number"
                            name="discount"
                            value={form.discount}
                            onChange={onFieldChange}
                            placeholder="0"
                            min="0"
                            step="1"
                        />
                    </label>

                    <label className='dashboard-field dashboard-field-full'>
                        <span>Colors</span>
                        <div className='dashboard-color-picker-group'>
                            <div className='dashboard-color-input'>
                                <input
                                    type="color"
                                    name="colorInput"
                                    value={form.colorInput}
                                    onChange={onColorInputChange}
                                />
                                <strong>{form.colorInput}</strong>
                            </div>
                            <button
                                type="button"
                                className='dashboard-add-color'
                                onClick={onAddColor}
                            >
                                Add Color
                            </button>
                        </div>
                        <div className='dashboard-color-list'>
                            {form.colors.map((color) => (
                                <button
                                    key={color}
                                    type="button"
                                    className='dashboard-color-tag'
                                    onClick={() => onRemoveColor(color)}
                                    title="Remove color"
                                >
                                    <span
                                        className='dashboard-color-dot'
                                        style={{ backgroundColor: color }}
                                        aria-hidden="true"
                                    />
                                    {color}
                                </button>
                            ))}
                        </div>
                        <small className='dashboard-field-hint'>You can add multiple colors here. On the Home page, users can choose one color from them.</small>
                    </label>

                    {isLiquidProduct && (
                        <label className='dashboard-field dashboard-field-full'>
                            <span>Nicotine Levels</span>
                            <div className='dashboard-nicotine-list'>
                                {NICOTINE_OPTIONS.map((level) => {
                                    const isSelected = form.nicotineLevels.includes(level)
                                    const hasReachedLimit = form.nicotineLevels.length >= MAX_NICOTINE_LEVELS

                                    return (
                                        <button
                                            key={level}
                                            type="button"
                                            className={`dashboard-nicotine-tag ${isSelected ? 'active' : ''}`}
                                            onClick={() => onToggleNicotineLevel(level)}
                                            disabled={!isSelected && hasReachedLimit}
                                        >
                                            {formatNicotineLevel(level)}
                                        </button>
                                    )
                                })}
                            </div>
                            <small className='dashboard-field-hint'>
                                Choose up to {MAX_NICOTINE_LEVELS} nicotine options for liquid products. These levels will appear on the product card.
                            </small>
                        </label>
                    )}

                    <label className='dashboard-field'>
                        <span>Product Image</span>
                        <input
                            ref={imageInputRef}
                            type="file"
                            accept="image/*"
                            onChange={onImageChange}
                            required={!isEditing}
                        />
                        {isEditing && form.existingImage && (
                            <small className='dashboard-field-hint'>Leave this empty to keep the current product image.</small>
                        )}
                    </label>

                    {status.text && (
                        <p className={`dashboard-status ${status.type}`}>
                            {status.text}
                        </p>
                    )}

                    <div className='dashboard-form-actions'>
                        <button type="submit" className='dashboard-save' disabled={isSaving}>
                            {isSaving ? 'Saving...' : isEditing ? 'Update Product' : 'Add Product'}
                        </button>
                        {isEditing && (
                            <button type="button" className='dashboard-cancel' onClick={() => onReset()}>
                                Cancel Edit
                            </button>
                        )}
                    </div>
                </form>
            ) : (
                <div className='dashboard-empty-state'>
                    <h3>Add categories first</h3>
                    <p>You need at least one category before adding products.</p>
                </div>
            )}
        </section>
    )
}
