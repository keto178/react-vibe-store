const GUEST_CART_STORAGE_KEY = 'app1_guest_cart_items'

function canUseStorage() {
    return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

function sanitizeQuantity(value) {
    const parsedQuantity = Number(value)

    if (Number.isNaN(parsedQuantity) || parsedQuantity <= 0) {
        return 1
    }

    return Math.max(1, Math.floor(parsedQuantity))
}

function sanitizeColor(value, fallbackColor = '#5dc0ff') {
    const candidate = String(value || '').trim()
    return candidate || fallbackColor
}

function sanitizeGuestCartItem(item) {
    if (!item || typeof item !== 'object') {
        return null
    }

    const productId = String(item.productId || '').trim()

    if (!productId) {
        return null
    }

    const selectedColor = sanitizeColor(item.selectedColor, '#5dc0ff')
    const safeColorForId = selectedColor.replace(/[^a-z0-9]/gi, '').toLowerCase() || 'default'

    return {
        id: String(item.id || `guest-${productId}-${safeColorForId}`),
        productId,
        categoryId: String(item.categoryId || ''),
        name: String(item.name || ''),
        description: String(item.description || ''),
        price: Number(item.price) || 0,
        discount: Number(item.discount) || 0,
        image: String(item.image || ''),
        quantity: sanitizeQuantity(item.quantity),
        selectedColor,
        category: String(item.category || ''),
        type: String(item.type || 'Device')
    }
}

function sanitizeGuestCartItems(items) {
    if (!Array.isArray(items)) {
        return []
    }

    return items
        .map((item) => sanitizeGuestCartItem(item))
        .filter(Boolean)
}

export function readGuestCartItems() {
    if (!canUseStorage()) {
        return []
    }

    try {
        const rawGuestCart = window.localStorage.getItem(GUEST_CART_STORAGE_KEY)

        if (!rawGuestCart) {
            return []
        }

        return sanitizeGuestCartItems(JSON.parse(rawGuestCart))
    } catch {
        window.localStorage.removeItem(GUEST_CART_STORAGE_KEY)
        return []
    }
}

export function saveGuestCartItems(items) {
    if (!canUseStorage()) {
        return []
    }

    const sanitizedItems = sanitizeGuestCartItems(items)

    if (sanitizedItems.length === 0) {
        window.localStorage.removeItem(GUEST_CART_STORAGE_KEY)
        return []
    }

    window.localStorage.setItem(GUEST_CART_STORAGE_KEY, JSON.stringify(sanitizedItems))
    return sanitizedItems
}

export function clearGuestCartItems() {
    if (!canUseStorage()) {
        return
    }

    window.localStorage.removeItem(GUEST_CART_STORAGE_KEY)
}

export function addGuestCartItem(items, product, selectedColor) {
    const productId = String(product?.id || '').trim()

    if (!productId) {
        return sanitizeGuestCartItems(items)
    }

    const availableColors = Array.isArray(product?.colors) && product.colors.length > 0
        ? product.colors.map((color) => sanitizeColor(color))
        : [sanitizeColor(product?.color)]
    const resolvedSelectedColor = availableColors.includes(selectedColor)
        ? selectedColor
        : availableColors[0]
    const safeColorForId = resolvedSelectedColor.replace(/[^a-z0-9]/gi, '').toLowerCase() || 'default'
    const nextItems = sanitizeGuestCartItems(items)
    const existingItemIndex = nextItems.findIndex((item) => (
        item.productId === productId &&
        item.selectedColor === resolvedSelectedColor
    ))

    if (existingItemIndex >= 0) {
        nextItems[existingItemIndex] = {
            ...nextItems[existingItemIndex],
            quantity: nextItems[existingItemIndex].quantity + 1
        }

        return nextItems
    }

    return [
        {
            id: `guest-${productId}-${safeColorForId}`,
            productId,
            categoryId: String(product.categoryId || ''),
            name: String(product.name || ''),
            description: String(product.description || ''),
            price: Number(product.price) || 0,
            discount: Number(product.discount) || 0,
            image: String(product.image || ''),
            quantity: 1,
            selectedColor: resolvedSelectedColor,
            category: String(product.category || ''),
            type: String(product.type || 'Device')
        },
        ...nextItems
    ]
}

export function updateGuestCartItemQuantity(items, cartItemId, nextQuantity) {
    const sanitizedItems = sanitizeGuestCartItems(items)
    const normalizedItemId = String(cartItemId || '')

    if (!normalizedItemId) {
        return sanitizedItems
    }

    if (nextQuantity <= 0) {
        return sanitizedItems.filter((item) => item.id !== normalizedItemId)
    }

    return sanitizedItems.map((item) => (
        item.id === normalizedItemId
            ? {
                ...item,
                quantity: sanitizeQuantity(nextQuantity)
            }
            : item
    ))
}

export function removeGuestCartItem(items, cartItemId) {
    const normalizedItemId = String(cartItemId || '')

    if (!normalizedItemId) {
        return sanitizeGuestCartItems(items)
    }

    return sanitizeGuestCartItems(items).filter((item) => item.id !== normalizedItemId)
}
