export function getDiscountedPrice(item) {
    const price = Number(item?.price) || 0
    const discount = Number(item?.discount) || 0

    return discount > 0 ? price - ((price * discount) / 100) : price
}

export function calculateOrderSummary(items = []) {
    const itemCount = items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0)
    const subtotal = items.reduce((sum, item) => (
        sum + (getDiscountedPrice(item) * (Number(item.quantity) || 0))
    ), 0)
    const shippingFee = 0

    return {
        itemCount,
        subtotal,
        shippingFee,
        total: subtotal + shippingFee
    }
}

export function formatShippingAddress(customer = {}) {
    return [
        customer.addressLine1,
        customer.addressLine2,
        [customer.city, customer.state, customer.postalCode].filter(Boolean).join(', '),
        customer.country
    ].filter(Boolean).join(', ')
}
