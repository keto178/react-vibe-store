import React from 'react'

const EMPTY_CATEGORY_FORM = {
    name: '',
    group: 'Device',
    existingImage: ''
}

const EMPTY_STATUS = {
    type: '',
    text: ''
}

export default function CategorySection({
    categories = [],
    sectionRef,
    form = EMPTY_CATEGORY_FORM,
    status = EMPTY_STATUS,
    isSaving,
    isEditing,
    imageInputRef,
    onFieldChange,
    onImageChange,
    onSubmit,
    onReset,
    onEdit,
    onDelete
}) {
    return (
        <section ref={sectionRef} className='dashboard-panel'>
            <div className='dashboard-panel-heading'>
                <div>
                    <p className='dashboard-badge'>Add Categories</p>
                    <h2>Build your category lists</h2>
                </div>
                <span className='dashboard-products-count'>{isEditing ? 'Editing Category' : 'New Category'}</span>
            </div>

            <form className='dashboard-form dashboard-category-form' onSubmit={onSubmit}>
                <label className='dashboard-field'>
                    <span>Category Name</span>
                    <input
                        type="text"
                        name="name"
                        value={form.name}
                        onChange={onFieldChange}
                        placeholder='e.g. Dessert'
                        required
                    />
                </label>

                <label className='dashboard-field'>
                    <span>List Type</span>
                    <select name="group" value={form.group} onChange={onFieldChange}>
                        <option value="Device">Device</option>
                        <option value="Liquid">Liquid</option>
                    </select>
                </label>

                <label className='dashboard-field dashboard-field-full'>
                    <span>Category Image</span>
                    <input
                        ref={imageInputRef}
                        type="file"
                        accept="image/*"
                        onChange={onImageChange}
                        required={!isEditing}
                    />
                    {isEditing && form.existingImage && (
                        <small className='dashboard-field-hint'>Leave this empty to keep the current category image.</small>
                    )}
                </label>

                {status.text && (
                    <p className={`dashboard-status ${status.type}`}>
                        {status.text}
                    </p>
                )}

                <div className='dashboard-form-actions'>
                    <button type="submit" className='dashboard-save' disabled={isSaving}>
                        {isSaving ? 'Saving...' : isEditing ? 'Update Category' : 'Add Category'}
                    </button>
                    {isEditing && (
                        <button type="button" className='dashboard-cancel' onClick={onReset}>
                            Cancel Edit
                        </button>
                    )}
                </div>
            </form>

            {categories.length > 0 ? (
                <div className='dashboard-categories-grid'>
                    {categories.map((category) => (
                        <div key={category.id} className='dashboard-category-card'>
                            <div className='dashboard-category-image-wrap'>
                                <img
                                    src={category.image}
                                    alt={category.name}
                                    className='dashboard-category-image'
                                    loading="lazy"
                                    decoding="async"
                                />
                            </div>
                            <strong>{category.name}</strong>
                            <span className='dashboard-category-group'>{category.group}</span>
                            <div className='dashboard-category-actions'>
                                <button
                                    type="button"
                                    className='dashboard-card-btn edit'
                                    onClick={() => onEdit(category)}
                                >
                                    Edit
                                </button>
                                <button
                                    type="button"
                                    className='dashboard-card-btn delete'
                                    onClick={() => onDelete(category.id, category.name)}
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className='dashboard-empty-state'>
                    <h3>No categories yet</h3>
                    <p>Add your first category to unlock product assignment.</p>
                </div>
            )}
        </section>
    )
}
