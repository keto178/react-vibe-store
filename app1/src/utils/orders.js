function normalizeOrderItem(item) {
    return {
        ...item,
        price: Number(item?.price) || 0,
        discount: Number(item?.discount) || 0,
        quantity: Number(item?.quantity) || 1,
        selectedColor: item?.selectedColor || item?.color || '#5dc0ff'
    }
}

export function getDiscountedPrice(item) {
    const price = Number(item?.price) || 0
    const discount = Number(item?.discount) || 0

    return discount > 0 ? price - ((price * discount) / 100) : price
}

export function calculateOrderSummary(items) {
    const normalizedItems = Array.isArray(items) ? items.map(normalizeOrderItem) : []
    const itemCount = normalizedItems.reduce((sum, item) => sum + item.quantity, 0)
    const subtotal = normalizedItems.reduce((sum, item) => sum + (getDiscountedPrice(item) * item.quantity), 0)
    const shippingFee = 0

    return {
        itemCount,
        subtotal,
        shippingFee,
        total: subtotal + shippingFee
    }
}

export function formatShippingAddress(customer) {
    const addressLines = [
        customer?.addressLine1,
        customer?.addressLine2,
        [customer?.city, customer?.state, customer?.postalCode].filter(Boolean).join(', '),
        customer?.country
    ]

    return addressLines.filter(Boolean).join(', ')
}
