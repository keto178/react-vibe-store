function toId(value) {
    if (!value) {
        return ''
    }

    if (typeof value === 'string') {
        return value
    }

    if (typeof value.toString === 'function') {
        return value.toString()
    }

    return ''
}

function sanitizeNicotineLevels(levels, productType) {
    const allowedNicotineLevels = [9, 12, 30, 50]

    if (productType !== 'Liquid' || !Array.isArray(levels)) {
        return []
    }

    return Array.from(
        new Set(
            levels
                .map((level) => Number(level))
                .filter((level) => allowedNicotineLevels.includes(level))
        )
    )
        .sort((firstLevel, secondLevel) => firstLevel - secondLevel)
        .slice(0, 2)
}

export function serializeUser(user) {
    return {
        id: toId(user?._id),
        username: user?.username || '',
        email: user?.email || '',
        role: user?.role || 'user'
    }
}

export function serializeCategory(category) {
    return {
        id: toId(category?._id),
        name: category?.name || '',
        group: category?.group || 'Device',
        image: category?.image || ''
    }
}

export function serializeProduct(product) {
    const category = product?.category && typeof product.category === 'object' && 'name' in product.category
        ? product.category
        : null
    const colors = Array.isArray(product?.colors) && product.colors.length > 0
        ? product.colors
        : ['#5dc0ff']
    const type = category?.group === 'Liquid' ? 'Liquid' : 'Device'
    const nicotineLevels = sanitizeNicotineLevels(product?.nicotineLevels, type)

    return {
        id: toId(product?._id),
        name: product?.name || '',
        description: product?.description || '',
        price: Number(product?.price) || 0,
        discount: Number(product?.discount) || 0,
        image: product?.image || '',
        category: category?.name || '',
        categoryId: category ? toId(category._id) : toId(product?.category),
        categoryImage: category?.image || '',
        colors,
        nicotineLevels,
        color: colors[0],
        type,
        rating: Number(product?.rating) || 4.5,
        createdAt: product?.createdAt || null,
        updatedAt: product?.updatedAt || null
    }
}

export function serializeCartItem(item) {
    const product = item?.product
    const category = product?.category
    const colors = Array.isArray(product?.colors) && product.colors.length > 0
        ? product.colors
        : ['#5dc0ff']

    return {
        id: toId(item?._id),
        productId: toId(product?._id),
        categoryId: toId(category?._id),
        name: product?.name || '',
        description: product?.description || '',
        price: Number(product?.price) || 0,
        discount: Number(product?.discount) || 0,
        image: product?.image || '',
        quantity: Number(item?.quantity) || 1,
        selectedColor: item?.selectedColor || colors[0],
        category: category?.name || '',
        type: category?.group === 'Liquid' ? 'Liquid' : 'Device'
    }
}

export function serializeOrder(order) {
    return {
        id: toId(order?._id),
        createdAt: order?.createdAt || null,
        status: order?.status || 'pending',
        items: Array.isArray(order?.items)
            ? order.items.map((item) => ({
                id: toId(item?._id),
                productId: toId(item?.product),
                name: item?.name || '',
                description: item?.description || '',
                price: Number(item?.price) || 0,
                discount: Number(item?.discount) || 0,
                image: item?.image || '',
                quantity: Number(item?.quantity) || 1,
                selectedColor: item?.selectedColor || '#5dc0ff',
                category: item?.category || '',
                categoryId: item?.categoryId || '',
                type: item?.type || 'Device'
            }))
            : [],
        customer: {
            fullName: order?.customer?.fullName || '',
            email: order?.customer?.email || '',
            phone: order?.customer?.phone || '',
            addressLine1: order?.customer?.addressLine1 || '',
            addressLine2: order?.customer?.addressLine2 || '',
            city: order?.customer?.city || '',
            state: order?.customer?.state || '',
            postalCode: order?.customer?.postalCode || '',
            country: order?.customer?.country || '',
            notes: order?.customer?.notes || ''
        },
        customerSession: order?.customerSession
            ? {
                userId: toId(order.customerSession.userId),
                username: order.customerSession.username || '',
                email: order.customerSession.email || ''
            }
            : null,
        summary: {
            itemCount: Number(order?.summary?.itemCount) || 0,
            subtotal: Number(order?.summary?.subtotal) || 0,
            shippingFee: Number(order?.summary?.shippingFee) || 0,
            total: Number(order?.summary?.total) || 0
        },
        emailNotification: {
            status: order?.emailNotification?.status || 'pending',
            message: order?.emailNotification?.message || ''
        },
        isNew: Boolean(order?.isUnread)
    }
}
