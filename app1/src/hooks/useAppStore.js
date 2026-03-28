import { useEffect, useState } from 'react'
import { isDashboardOwner } from '../utils/auth'
import {
    addCartItemApi,
    checkoutApi,
    createCategoryApi,
    createProductApi,
    deleteCategoryApi,
    deleteOrderApi,
    deleteProductApi,
    fetchAdminOrdersApi,
    fetchCartApi,
    fetchCategoriesApi,
    fetchProductsApi,
    fetchUserOrdersApi,
    markOrdersAsSeenApi,
    removeCartItemApi,
    updateCartItemApi,
    updateCategoryApi,
    updateOrderStatusApi,
    updateProductApi
} from '../utils/api'
import {
    addGuestCartItem,
    clearGuestCartItems,
    readGuestCartItems,
    removeGuestCartItem,
    saveGuestCartItems,
    updateGuestCartItemQuantity
} from '../utils/guestCart'

function ensureArray(value) {
    return Array.isArray(value) ? value : []
}

function ensureRecord(value, recordName) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        throw new Error(`The server returned an invalid ${recordName}.`)
    }

    return value
}

function logStoreError(error) {
    if (import.meta.env.DEV) {
        console.error(error)
    }
}

export function useAppStore(activeSession) {
    const [products, setProducts] = useState([])
    const [cartItems, setCartItems] = useState([])
    const [categories, setCategories] = useState([])
    const [orders, setOrders] = useState([])
    const [isCatalogLoading, setIsCatalogLoading] = useState(true)
    const [catalogError, setCatalogError] = useState('')

    const isAdmin = isDashboardOwner(activeSession)
    const sessionId = activeSession?.id || ''
    const sessionRole = activeSession?.role || ''
    const hasSession = Boolean(sessionId)
    const requiresPhoneVerification = Boolean(activeSession?.requiresPhoneVerification)
    const isFallbackSession = activeSession?.authMode === 'fallback'
    const offlineFeatureMessage = (
        'Saving is temporarily disabled because the server is running in fallback mode. Reconnect MongoDB to persist changes.'
    )
    const phoneVerificationRequiredMessage = 'Verify your phone number to continue.'

    const refreshCatalog = async () => {
        const [categoriesResponse, productsResponse] = await Promise.all([
            fetchCategoriesApi(),
            fetchProductsApi()
        ])

        setCategories(ensureArray(categoriesResponse?.categories))
        setProducts(ensureArray(productsResponse?.products))
    }

    const refreshCart = async () => {
        if (!activeSession) {
            setCartItems(readGuestCartItems())
            return
        }

        if (requiresPhoneVerification) {
            setCartItems([])
            return
        }

        if (isFallbackSession) {
            setCartItems([])
            return
        }

        const response = await fetchCartApi()
        setCartItems(ensureArray(response?.items))
    }

    useEffect(() => {
        let isCancelled = false

        async function loadStore() {
            setIsCatalogLoading(true)
            setCatalogError('')

            try {
                const catalogPromise = Promise.all([
                    fetchCategoriesApi(),
                    fetchProductsApi()
                ])
                const shouldLoadSessionData = !isFallbackSession && hasSession && !requiresPhoneVerification

                if (shouldLoadSessionData) {
                    const guestCartItems = readGuestCartItems()

                    if (guestCartItems.length > 0) {
                        const failedItems = []

                        for (const item of guestCartItems) {
                            try {
                                await addCartItemApi({
                                    productId: item.productId,
                                    quantity: item.quantity,
                                    selectedColor: item.selectedColor
                                })
                            } catch (error) {
                                failedItems.push(item)
                                logStoreError(error)
                            }
                        }

                        if (failedItems.length > 0) {
                            saveGuestCartItems(failedItems)
                        } else {
                            clearGuestCartItems()
                        }
                    }
                }

                const sessionDataPromise = shouldLoadSessionData
                    ? Promise.all([
                        fetchCartApi(),
                        sessionRole === 'admin' ? fetchAdminOrdersApi() : fetchUserOrdersApi()
                    ])
                    : Promise.resolve([null, null])
                const [[categoriesResponse, productsResponse], [cartResponse, ordersResponse]] = await Promise.all([
                    catalogPromise,
                    sessionDataPromise
                ])

                if (isCancelled) {
                    return
                }

                setCategories(ensureArray(categoriesResponse?.categories))
                setProducts(ensureArray(productsResponse?.products))
                setCatalogError('')
                setIsCatalogLoading(false)

                if (isFallbackSession) {
                    setCartItems([])
                    setOrders([])
                    return
                }

                if (!hasSession) {
                    setCartItems(readGuestCartItems())
                    setOrders([])
                    return
                }

                if (requiresPhoneVerification) {
                    setCartItems([])
                    setOrders([])
                    return
                }

                setCartItems(ensureArray(cartResponse?.items))
                setOrders(ensureArray(ordersResponse?.orders))
            } catch (error) {
                if (isCancelled) {
                    return
                }

                setCatalogError(error.message || 'Unable to load catalog data right now.')
                setIsCatalogLoading(false)

                if (!hasSession) {
                    setCartItems(readGuestCartItems())
                    setOrders([])
                }

                if (requiresPhoneVerification) {
                    setCartItems([])
                    setOrders([])
                }

                logStoreError(error)
            }
        }

        loadStore()

        return () => {
            isCancelled = true
        }
    }, [hasSession, isFallbackSession, requiresPhoneVerification, sessionId, sessionRole])

    const handleAddProduct = async (product) => {
        if (isFallbackSession) {
            throw new Error(offlineFeatureMessage)
        }

        const response = await createProductApi(product)
        const savedProduct = ensureRecord(response?.product, 'product')

        setProducts((currentProducts) => [savedProduct, ...currentProducts])

        return savedProduct
    }

    const handleUpdateProduct = async (updatedProduct) => {
        if (isFallbackSession) {
            throw new Error(offlineFeatureMessage)
        }

        const response = await updateProductApi(updatedProduct.id, updatedProduct)
        const savedProduct = ensureRecord(response?.product, 'product')

        setProducts((currentProducts) =>
            currentProducts.map((product) => (
                product.id === savedProduct.id ? savedProduct : product
            ))
        )

        if (activeSession) {
            await refreshCart()
        }

        return savedProduct
    }

    const handleDeleteProduct = async (productId) => {
        if (isFallbackSession) {
            throw new Error(offlineFeatureMessage)
        }

        await deleteProductApi(productId)

        setProducts((currentProducts) =>
            currentProducts.filter((product) => product.id !== productId)
        )

        if (activeSession) {
            await refreshCart()
        }
    }

    const handleAddCategory = async (category) => {
        if (isFallbackSession) {
            throw new Error(offlineFeatureMessage)
        }

        const response = await createCategoryApi(category)
        const savedCategory = ensureRecord(response?.category, 'category')

        setCategories((currentCategories) => [savedCategory, ...currentCategories])

        return savedCategory
    }

    const handleUpdateCategory = async (updatedCategory) => {
        if (isFallbackSession) {
            throw new Error(offlineFeatureMessage)
        }

        await updateCategoryApi(updatedCategory.id, updatedCategory)
        await refreshCatalog()

        if (activeSession) {
            await refreshCart()
        }
    }

    const handleDeleteCategory = async (categoryId) => {
        if (isFallbackSession) {
            throw new Error(offlineFeatureMessage)
        }

        await deleteCategoryApi(categoryId)
        await refreshCatalog()

        if (activeSession) {
            await refreshCart()
        }
    }

    const handleAddToCart = async (product, selectedColor) => {
        if (!activeSession) {
            const nextGuestCartItems = saveGuestCartItems(
                addGuestCartItem(cartItems, product, selectedColor)
            )

            setCartItems(nextGuestCartItems)

            return {
                ok: true,
                mode: 'guest'
            }
        }

        if (requiresPhoneVerification) {
            return {
                ok: false,
                message: phoneVerificationRequiredMessage
            }
        }

        if (isFallbackSession) {
            return {
                ok: false,
                message: offlineFeatureMessage
            }
        }

        try {
            const response = await addCartItemApi({
                productId: product.id,
                quantity: 1,
                selectedColor
            })

            setCartItems(ensureArray(response?.items))

            return {
                ok: true
            }
        } catch (error) {
            return {
                ok: false,
                message: error.message
            }
        }
    }

    const handleUpdateCartQuantity = async (cartItemId, nextQuantity) => {
        if (!activeSession) {
            const nextGuestCartItems = saveGuestCartItems(
                updateGuestCartItemQuantity(cartItems, cartItemId, nextQuantity)
            )

            setCartItems(nextGuestCartItems)
            return
        }

        if (requiresPhoneVerification) {
            return
        }

        if (isFallbackSession) {
            return
        }

        try {
            const response = nextQuantity <= 0
                ? await removeCartItemApi(cartItemId)
                : await updateCartItemApi(cartItemId, { quantity: nextQuantity })

            setCartItems(ensureArray(response?.items))
        } catch (error) {
            logStoreError(error)
        }
    }

    const handleRemoveFromCart = async (cartItemId) => {
        if (!activeSession) {
            const nextGuestCartItems = saveGuestCartItems(
                removeGuestCartItem(cartItems, cartItemId)
            )

            setCartItems(nextGuestCartItems)
            return
        }

        if (requiresPhoneVerification) {
            return
        }

        if (isFallbackSession) {
            return
        }

        try {
            const response = await removeCartItemApi(cartItemId)
            setCartItems(ensureArray(response?.items))
        } catch (error) {
            logStoreError(error)
        }
    }

    const handlePlaceOrder = async (shippingDetails) => {
        if (!activeSession) {
            return {
                ok: false,
                message: 'Please log in before placing an order.'
            }
        }

        if (requiresPhoneVerification) {
            return {
                ok: false,
                message: phoneVerificationRequiredMessage
            }
        }

        if (isFallbackSession) {
            return {
                ok: false,
                message: offlineFeatureMessage
            }
        }

        try {
            const response = await checkoutApi(shippingDetails)
            const savedOrder = ensureRecord(response?.order, 'order')

            setOrders((currentOrders) => [savedOrder, ...currentOrders])
            setCartItems([])

            return {
                ok: true,
                order: savedOrder
            }
        } catch (error) {
            return {
                ok: false,
                message: error.message
            }
        }
    }

    const handleMarkOrdersAsSeen = async () => {
        if (!isAdmin) {
            return
        }

        if (requiresPhoneVerification) {
            return
        }

        if (isFallbackSession) {
            return
        }

        try {
            const response = await markOrdersAsSeenApi()
            setOrders(ensureArray(response?.orders))
        } catch (error) {
            logStoreError(error)
        }
    }

    const handleUpdateOrderStatus = async (orderId, nextStatus) => {
        if (!isAdmin) {
            return {
                ok: false,
                message: 'Only admins can update order status.'
            }
        }

        if (requiresPhoneVerification) {
            return {
                ok: false,
                message: phoneVerificationRequiredMessage
            }
        }

        if (isFallbackSession) {
            return {
                ok: false,
                message: offlineFeatureMessage
            }
        }

        try {
            const response = await updateOrderStatusApi(orderId, nextStatus)
            const savedOrder = ensureRecord(response?.order, 'order')

            setOrders((currentOrders) =>
                currentOrders.map((order) => (
                    order.id === savedOrder.id ? savedOrder : order
                ))
            )

            return {
                ok: true
            }
        } catch (error) {
            return {
                ok: false,
                message: error.message
            }
        }
    }

    const handleDeleteOrder = async (orderId) => {
        if (!isAdmin) {
            return {
                ok: false,
                message: 'Only admins can remove orders.'
            }
        }

        if (requiresPhoneVerification) {
            return {
                ok: false,
                message: phoneVerificationRequiredMessage
            }
        }

        if (isFallbackSession) {
            return {
                ok: false,
                message: offlineFeatureMessage
            }
        }

        try {
            await deleteOrderApi(orderId)

            setOrders((currentOrders) =>
                currentOrders.filter((order) => order.id !== orderId)
            )

            return {
                ok: true
            }
        } catch (error) {
            return {
                ok: false,
                message: error.message
            }
        }
    }

    return {
        products,
        cartItems,
        categories,
        orders,
        isCatalogLoading,
        catalogError,
        cartCount: ensureArray(cartItems).reduce((total, item) => total + item.quantity, 0),
        unreadOrdersCount: ensureArray(orders).filter((order) => order.isNew).length,
        handleAddProduct,
        handleUpdateProduct,
        handleDeleteProduct,
        handleAddCategory,
        handleUpdateCategory,
        handleDeleteCategory,
        handleAddToCart,
        handleUpdateCartQuantity,
        handleRemoveFromCart,
        handlePlaceOrder,
        handleMarkOrdersAsSeen,
        handleUpdateOrderStatus,
        handleDeleteOrder
    }
}
