import { sanitizeNicotineLevels } from '../../utils/nicotine'

export function createCategoryForm() {
    return {
        name: '',
        group: 'Device',
        imageFile: null,
        existingImage: ''
    }
}

export function createProductForm(categories = []) {
    return {
        name: '',
        description: '',
        price: '',
        discount: '',
        categoryId: categories[0]?.id || '',
        colorInput: '#5dc0ff',
        colors: ['#5dc0ff'],
        nicotineLevels: [],
        imageFile: null,
        existingImage: ''
    }
}

export function createCategoryFormFromItem(category) {
    return {
        name: category.name,
        group: category.group || 'Device',
        imageFile: null,
        existingImage: category.image
    }
}

export function createProductFormFromItem(product, categories = []) {
    return {
        name: product.name,
        description: product.description,
        price: String(product.price),
        discount: String(product.discount || 0),
        categoryId: product.categoryId || categories.find((category) => category.name === product.category)?.id || categories[0]?.id || '',
        colorInput: product.colors?.[0] || product.color || '#5dc0ff',
        colors: product.colors?.length ? product.colors : [product.color || '#5dc0ff'],
        nicotineLevels: sanitizeNicotineLevels(product.nicotineLevels),
        imageFile: null,
        existingImage: product.image
    }
}
