import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { clearActiveSession } from '../../utils/auth'
import { readFileAsDataUrl } from '../../utils/files'
import { MAX_NICOTINE_LEVELS, sanitizeNicotineLevels } from '../../utils/nicotine'
import {
    createCategoryForm,
    createCategoryFormFromItem,
    createProductForm,
    createProductFormFromItem
} from './dashboardForms'

export function useDashboardManager({
    activeSession,
    categories = [],
    products = [],
    onAddCategory,
    onUpdateCategory,
    onDeleteCategory,
    onAddProduct,
    onUpdateProduct,
    onDeleteProduct
}) {
    const navigate = useNavigate()
    const activeUser = activeSession
    const [categoryForm, setCategoryForm] = useState(() => createCategoryForm())
    const [productForm, setProductForm] = useState(() => createProductForm(categories))
    const [categoryStatus, setCategoryStatus] = useState({ type: '', text: '' })
    const [productStatus, setProductStatus] = useState({ type: '', text: '' })
    const [isSavingCategory, setIsSavingCategory] = useState(false)
    const [isSavingProduct, setIsSavingProduct] = useState(false)
    const [editingCategoryId, setEditingCategoryId] = useState(null)
    const [editingProductId, setEditingProductId] = useState(null)
    const categoryImageInputRef = useRef(null)
    const productImageInputRef = useRef(null)
    const categorySectionRef = useRef(null)
    const productSectionRef = useRef(null)
    const isEditingCategory = editingCategoryId !== null
    const isEditingProduct = editingProductId !== null

    useEffect(() => {
        setProductForm((currentForm) => {
            if (categories.length === 0) {
                return {
                    ...currentForm,
                    categoryId: ''
                }
            }

            const hasSelectedCategory = categories.some((category) => category.id === currentForm.categoryId)

            if (hasSelectedCategory) {
                return currentForm
            }

            return {
                ...currentForm,
                categoryId: categories[0].id
            }
        })
    }, [categories])

    const handleLogout = () => {
        clearActiveSession()
        navigate('/Login')
    }

    const handleCategoryChange = (event) => {
        const { name, value } = event.target

        setCategoryForm((currentForm) => ({
            ...currentForm,
            [name]: value
        }))
        setCategoryStatus({ type: '', text: '' })
    }

    const handleCategoryImageChange = (event) => {
        const file = event.target.files?.[0] || null

        setCategoryForm((currentForm) => ({
            ...currentForm,
            imageFile: file
        }))
        setCategoryStatus({ type: '', text: '' })
    }

    const handleProductChange = (event) => {
        const { name, value } = event.target

        setProductForm((currentForm) => ({
            ...currentForm,
            [name]: value,
            ...(name === 'categoryId' && (categories.find((category) => category.id === value)?.group || 'Device') !== 'Liquid'
                ? { nicotineLevels: [] }
                : {})
        }))
        setProductStatus({ type: '', text: '' })
    }

    const handleProductColorInputChange = (event) => {
        const { value } = event.target

        setProductForm((currentForm) => ({
            ...currentForm,
            colorInput: value
        }))
        setProductStatus({ type: '', text: '' })
    }

    const handleAddProductColor = () => {
        setProductForm((currentForm) => {
            if (currentForm.colors.includes(currentForm.colorInput)) {
                return currentForm
            }

            return {
                ...currentForm,
                colors: [...currentForm.colors, currentForm.colorInput]
            }
        })
        setProductStatus({ type: '', text: '' })
    }

    const handleRemoveProductColor = (colorToRemove) => {
        setProductForm((currentForm) => {
            const updatedColors = currentForm.colors.filter((color) => color !== colorToRemove)
            const safeColors = updatedColors.length > 0 ? updatedColors : [currentForm.colorInput]

            return {
                ...currentForm,
                colors: safeColors,
                colorInput: safeColors[0]
            }
        })
        setProductStatus({ type: '', text: '' })
    }

    const handleToggleProductNicotineLevel = (levelToToggle) => {
        setProductForm((currentForm) => {
            const selectedLevels = sanitizeNicotineLevels(currentForm.nicotineLevels)

            if (selectedLevels.includes(levelToToggle)) {
                return {
                    ...currentForm,
                    nicotineLevels: selectedLevels.filter((level) => level !== levelToToggle)
                }
            }

            if (selectedLevels.length >= MAX_NICOTINE_LEVELS) {
                return currentForm
            }

            return {
                ...currentForm,
                nicotineLevels: sanitizeNicotineLevels([...selectedLevels, levelToToggle])
            }
        })
        setProductStatus({ type: '', text: '' })
    }

    const handleProductImageChange = (event) => {
        const file = event.target.files?.[0] || null

        setProductForm((currentForm) => ({
            ...currentForm,
            imageFile: file
        }))
        setProductStatus({ type: '', text: '' })
    }

    const resetCategoryForm = () => {
        setCategoryForm(createCategoryForm())
        setEditingCategoryId(null)
        setIsSavingCategory(false)

        if (categoryImageInputRef.current) {
            categoryImageInputRef.current.value = ''
        }
    }

    const resetProductForm = (nextCategories = categories) => {
        setProductForm(createProductForm(nextCategories))
        setEditingProductId(null)
        setIsSavingProduct(false)

        if (productImageInputRef.current) {
            productImageInputRef.current.value = ''
        }
    }

    const handleEditCategory = (category) => {
        setEditingCategoryId(category.id)
        setCategoryForm(createCategoryFormFromItem(category))
        setCategoryStatus({ type: 'success', text: `Editing ${category.name}. Update the fields and save your changes.` })

        if (categoryImageInputRef.current) {
            categoryImageInputRef.current.value = ''
        }

        categorySectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }

    const handleDeleteCategoryItem = async (categoryId, categoryName) => {
        try {
            await onDeleteCategory(categoryId)

            if (editingCategoryId === categoryId) {
                resetCategoryForm()
            }

            setCategoryStatus({ type: 'success', text: `${categoryName} category was removed.` })
        } catch (error) {
            setCategoryStatus({ type: 'error', text: error.message })
        }
    }

    const handleCategorySubmit = async (event) => {
        event.preventDefault()

        if (!categoryForm.name.trim()) {
            setCategoryStatus({ type: 'error', text: 'Please enter a category name.' })
            return
        }

        if (!categoryForm.imageFile && !categoryForm.existingImage) {
            setCategoryStatus({ type: 'error', text: 'Please upload an image for the category.' })
            return
        }

        const categoryExists = categories.some((category) => (
            category.id !== editingCategoryId &&
            category.name.trim().toLowerCase() === categoryForm.name.trim().toLowerCase() &&
            (category.group || 'Device') === categoryForm.group
        ))

        if (categoryExists) {
            setCategoryStatus({ type: 'error', text: 'This category already exists in the selected list.' })
            return
        }

        setIsSavingCategory(true)

        try {
            const image = categoryForm.imageFile ? await readFileAsDataUrl(categoryForm.imageFile) : categoryForm.existingImage
            const preparedCategory = {
                id: editingCategoryId || `${Date.now()}`,
                name: categoryForm.name.trim(),
                group: categoryForm.group,
                image
            }

            if (isEditingCategory) {
                await onUpdateCategory(preparedCategory)
                setCategoryStatus({ type: 'success', text: `${preparedCategory.name} category was updated.` })
            } else {
                const savedCategory = await onAddCategory(preparedCategory)
                setProductForm((currentForm) => ({
                    ...currentForm,
                    categoryId: currentForm.categoryId || savedCategory.id
                }))
                setCategoryStatus({ type: 'success', text: `${preparedCategory.name} category was added successfully.` })
            }

            resetCategoryForm()
        } catch (error) {
            setCategoryStatus({ type: 'error', text: error.message })
        } finally {
            setIsSavingCategory(false)
        }
    }

    const handleEditProduct = (product) => {
        setEditingProductId(product.id)
        setProductForm(createProductFormFromItem(product, categories))
        setProductStatus({ type: 'success', text: `Editing ${product.name}. Update the fields and save your changes.` })

        if (productImageInputRef.current) {
            productImageInputRef.current.value = ''
        }

        productSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }

    const handleDeleteProductItem = async (productId, productName) => {
        try {
            await onDeleteProduct(productId)

            if (editingProductId === productId) {
                resetProductForm()
            }

            setProductStatus({ type: 'success', text: `${productName} was removed from the dashboard and Home page.` })
        } catch (error) {
            setProductStatus({ type: 'error', text: error.message })
        }
    }

    const handleProductSubmit = async (event) => {
        event.preventDefault()

        if (!productForm.name.trim() || !productForm.description.trim()) {
            setProductStatus({ type: 'error', text: 'Please enter the product name and description.' })
            return
        }

        if (!productForm.price || Number(productForm.price) <= 0) {
            setProductStatus({ type: 'error', text: 'Please enter a valid price greater than 0.' })
            return
        }

        if (productForm.discount && Number(productForm.discount) < 0) {
            setProductStatus({ type: 'error', text: 'Discount cannot be negative.' })
            return
        }

        if (!productForm.categoryId) {
            setProductStatus({ type: 'error', text: 'Please choose a category for the product.' })
            return
        }

        if (!productForm.imageFile && !productForm.existingImage) {
            setProductStatus({ type: 'error', text: 'Please upload a product image.' })
            return
        }

        if (!productForm.colors.length) {
            setProductStatus({ type: 'error', text: 'Please add at least one color for the product.' })
            return
        }

        const selectedCategory = categories.find((category) => category.id === productForm.categoryId)

        if (!selectedCategory) {
            setProductStatus({ type: 'error', text: 'The selected category could not be found.' })
            return
        }

        const nicotineLevels = selectedCategory.group === 'Liquid'
            ? sanitizeNicotineLevels(productForm.nicotineLevels)
            : []

        if (selectedCategory.group === 'Liquid' && nicotineLevels.length === 0) {
            setProductStatus({ type: 'error', text: 'Please choose at least one nicotine level for the liquid product.' })
            return
        }

        setIsSavingProduct(true)

        try {
            const image = productForm.imageFile ? await readFileAsDataUrl(productForm.imageFile) : productForm.existingImage
            const preparedProduct = {
                id: editingProductId || `${Date.now()}`,
                name: productForm.name.trim(),
                description: productForm.description.trim(),
                price: Number(productForm.price),
                discount: Number(productForm.discount) || 0,
                category: selectedCategory.name,
                categoryId: selectedCategory.id,
                categoryImage: selectedCategory.image,
                colors: productForm.colors,
                color: productForm.colors[0],
                nicotineLevels,
                type: selectedCategory.group === 'Liquid' ? 'Liquid' : 'Device',
                image
            }

            if (isEditingProduct) {
                await onUpdateProduct(preparedProduct)
                setProductStatus({ type: 'success', text: `${preparedProduct.name} was updated successfully.` })
            } else {
                await onAddProduct(preparedProduct)
                setProductStatus({ type: 'success', text: `${preparedProduct.name} was added and linked to ${selectedCategory.name}.` })
            }

            resetProductForm()
        } catch (error) {
            setProductStatus({ type: 'error', text: error.message })
        } finally {
            setIsSavingProduct(false)
        }
    }

    return {
        activeUser,
        handleLogout,
        categoryCount: categories.length,
        productCount: products.length,
        categorySectionProps: {
            categories,
            sectionRef: categorySectionRef,
            form: categoryForm,
            status: categoryStatus,
            isSaving: isSavingCategory,
            isEditing: isEditingCategory,
            imageInputRef: categoryImageInputRef,
            onFieldChange: handleCategoryChange,
            onImageChange: handleCategoryImageChange,
            onSubmit: handleCategorySubmit,
            onReset: resetCategoryForm,
            onEdit: handleEditCategory,
            onDelete: handleDeleteCategoryItem
        },
        productSectionProps: {
            categories,
            sectionRef: productSectionRef,
            form: productForm,
            status: productStatus,
            isSaving: isSavingProduct,
            isEditing: isEditingProduct,
            imageInputRef: productImageInputRef,
            onFieldChange: handleProductChange,
            onColorInputChange: handleProductColorInputChange,
            onAddColor: handleAddProductColor,
            onRemoveColor: handleRemoveProductColor,
            onToggleNicotineLevel: handleToggleProductNicotineLevel,
            onImageChange: handleProductImageChange,
            onSubmit: handleProductSubmit,
            onReset: resetProductForm
        },
        productListProps: {
            products,
            onEdit: handleEditProduct,
            onDelete: handleDeleteProductItem
        }
    }
}
