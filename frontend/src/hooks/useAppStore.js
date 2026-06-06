import { useCallback, useEffect, useRef, useState } from 'react'
import { isDashboardOwner } from '../services/session'
import {
    addCartItemApi, checkoutApi, createCategoryApi, createProductApi,
    deleteCategoryApi, deleteOrderApi, deleteProductApi, fetchAdminOrdersApi,
    fetchApiHealthApi, fetchCartApi, fetchCategoriesApi, fetchProductsApi,
    fetchUserOrdersApi, markOrdersAsSeenApi, removeCartItemApi,
    updateCartItemApi, updateCategoryApi, updateOrderStatusApi, updateProductApi
} from '../api'
import {
    addGuestCartItem, clearGuestCartItems, readGuestCartItems,
    removeGuestCartItem, saveGuestCartItems, updateGuestCartItemQuantity
} from '../utils/guestCart'
import {
    DEFAULT_SERVER_HEALTH, getWriteAccessMessage, normalizeServerHealth
} from '../utils/serverHealth'

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
    const [serverHealth, setServerHealth] = useState(DEFAULT_SERVER_HEALTH)

    const isAdmin = isDashboardOwner(activeSession)
    const sessionId = activeSession?.id || ''
    const sessionRole = activeSession?.role || ''
    const hasSession = Boolean(sessionId)
    const requiresEmailVerification = Boolean(activeSession?.requiresEmailVerification)
    const offlineFeatureMessage = getWriteAccessMessage(serverHealth)
    const emailVerificationRequiredMessage = 'Verify your email address to continue.'

    const activeSessionRef = useRef(activeSession)
    activeSessionRef.current = activeSession

    const offlineFeatureMessageRef = useRef(offlineFeatureMessage)
    offlineFeatureMessageRef.current = offlineFeatureMessage

    const requiresEmailVerificationRef = useRef(requiresEmailVerification)
    requiresEmailVerificationRef.current = requiresEmailVerification

    const isAdminRef = useRef(isAdmin)
    isAdminRef.current = isAdmin

    const refreshCatalog = useCallback(async () => {
        const [categoriesResponse, productsResponse] = await Promise.all([
            fetchCategoriesApi(),
            fetchProductsApi()
        ])

        setCategories(ensureArray(categoriesResponse?.categories))
        setProducts(ensureArray(productsResponse?.products))
    }, [])

    const refreshCart = useCallback(async () => {
        const session = activeSessionRef.current

        if (!session) {
            setCartItems(readGuestCartItems())
            return
        }

        if (requiresEmailVerificationRef.current) {
            setCartItems([])
            return
        }

        const response = await fetchCartApi()
        setCartItems(ensureArray(response?.items))
    }, [])

    useEffect(() => {
        let isCancelled = false

        async function loadStore() {
            setIsCatalogLoading(true)
            setCatalogError('')

            try {
                const [healthResult, catalogResult] = await Promise.allSettled([
                    fetchApiHealthApi(),
                    Promise.all([
                        fetchCategoriesApi(),
                        fetchProductsApi()
                    ])
                ])
                const nextServerHealth = healthResult.status === 'fulfilled'
                    ? normalizeServerHealth(healthResult.value)
                    : DEFAULT_SERVER_HEALTH
                const shouldLoadSessionData = hasSession && !requiresEmailVerification

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

                if (catalogResult.status === 'rejected') {
                    throw catalogResult.reason
                }

                const sessionDataPromise = shouldLoadSessionData
                    ? Promise.all([
                        fetchCartApi(),
                        sessionRole === 'admin' ? fetchAdminOrdersApi() : fetchUserOrdersApi()
                    ])
                    : Promise.resolve([null, null])
                const [[categoriesResponse, productsResponse], [cartResponse, ordersResponse]] = await Promise.all([
                    Promise.resolve(catalogResult.value),
                    sessionDataPromise
                ])

                if (isCancelled) {
                    return
                }

                setServerHealth(nextServerHealth)
                setCategories(ensureArray(categoriesResponse?.categories))
                setProducts(ensureArray(productsResponse?.products))
                setCatalogError('')
                setIsCatalogLoading(false)

                if (!hasSession) {
                    setCartItems(readGuestCartItems())
                    setOrders([])
                    return
                }

                if (requiresEmailVerification) {
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

                try {
                    const healthResponse = await fetchApiHealthApi()
                    if (!isCancelled) {
                        setServerHealth(normalizeServerHealth(healthResponse))
                    }
                } catch {
                    if (!isCancelled) {
                        setServerHealth(DEFAULT_SERVER_HEALTH)
                    }
                }

                if (isCancelled) {
                    return
                }

                setCatalogError(error.message || 'Unable to load catalog data right now.')
                setIsCatalogLoading(false)

                if (!hasSession) {
                    setCartItems(readGuestCartItems())
                    setOrders([])
                }

                if (requiresEmailVerification) {
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
    }, [hasSession, requiresEmailVerification, sessionId, sessionRole])

    const handleAddProduct = useCallback(async (product) => {
        const msg = offlineFeatureMessageRef.current
        if (msg) throw new Error(msg)

        const response = await createProductApi(product)
        const savedProduct = ensureRecord(response?.product, 'product')

        setProducts((currentProducts) => [savedProduct, ...currentProducts])

        return savedProduct
    }, [])

    const handleUpdateProduct = useCallback(async (updatedProduct) => {
        const msg = offlineFeatureMessageRef.current
        if (msg) throw new Error(msg)

        const response = await updateProductApi(updatedProduct.id, updatedProduct)
        const savedProduct = ensureRecord(response?.product, 'product')

        setProducts((currentProducts) =>
            currentProducts.map((product) => (
                product.id === savedProduct.id ? savedProduct : product
            ))
        )

        if (activeSessionRef.current) {
            await refreshCart()
        }

        return savedProduct
    }, [refreshCart])

    const handleDeleteProduct = useCallback(async (productId) => {
        const msg = offlineFeatureMessageRef.current
        if (msg) throw new Error(msg)

        await deleteProductApi(productId)

        setProducts((currentProducts) =>
            currentProducts.filter((product) => product.id !== productId)
        )

        if (activeSessionRef.current) {
            await refreshCart()
        }
    }, [refreshCart])

    const handleAddCategory = useCallback(async (category) => {
        const msg = offlineFeatureMessageRef.current
        if (msg) throw new Error(msg)

        const response = await createCategoryApi(category)
        const savedCategory = ensureRecord(response?.category, 'category')

        setCategories((currentCategories) => [savedCategory, ...currentCategories])

        return savedCategory
    }, [])

    const handleUpdateCategory = useCallback(async (updatedCategory) => {
        const msg = offlineFeatureMessageRef.current
        if (msg) throw new Error(msg)

        await updateCategoryApi(updatedCategory.id, updatedCategory)
        await refreshCatalog()

        if (activeSessionRef.current) {
            await refreshCart()
        }
    }, [refreshCatalog, refreshCart])

    const handleDeleteCategory = useCallback(async (categoryId) => {
        const msg = offlineFeatureMessageRef.current
        if (msg) throw new Error(msg)

        await deleteCategoryApi(categoryId)
        await refreshCatalog()

        if (activeSessionRef.current) {
            await refreshCart()
        }
    }, [refreshCatalog, refreshCart])

    const handleAddToCart = useCallback(async (product, selectedColor) => {
        if (!activeSessionRef.current) {
            const nextGuestCartItems = saveGuestCartItems(
                addGuestCartItem(cartItems, product, selectedColor)
            )

            setCartItems(nextGuestCartItems)

            return {
                ok: true,
                mode: 'guest'
            }
        }

        if (requiresEmailVerificationRef.current) {
            return {
                ok: false,
                message: emailVerificationRequiredMessage
            }
        }

        const msg = offlineFeatureMessageRef.current
        if (msg) {
            return {
                ok: false,
                message: msg
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
    }, [cartItems])

    const handleUpdateCartQuantity = useCallback(async (cartItemId, nextQuantity) => {
        if (!activeSessionRef.current) {
            const nextGuestCartItems = saveGuestCartItems(
                updateGuestCartItemQuantity(cartItems, cartItemId, nextQuantity)
            )

            setCartItems(nextGuestCartItems)
            return
        }

        if (requiresEmailVerificationRef.current) {
            return
        }

        if (offlineFeatureMessageRef.current) {
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
    }, [cartItems])

    const handleRemoveFromCart = useCallback(async (cartItemId) => {
        if (!activeSessionRef.current) {
            const nextGuestCartItems = saveGuestCartItems(
                removeGuestCartItem(cartItems, cartItemId)
            )

            setCartItems(nextGuestCartItems)
            return
        }

        if (requiresEmailVerificationRef.current) {
            return
        }

        if (offlineFeatureMessageRef.current) {
            return
        }

        try {
            const response = await removeCartItemApi(cartItemId)
            setCartItems(ensureArray(response?.items))
        } catch (error) {
            logStoreError(error)
        }
    }, [cartItems])

    const handlePlaceOrder = useCallback(async (shippingDetails) => {
        if (requiresEmailVerificationRef.current) {
            return {
                ok: false,
                message: emailVerificationRequiredMessage
            }
        }

        const msg = offlineFeatureMessageRef.current
        if (msg) {
            return {
                ok: false,
                message: msg
            }
        }

        try {
            const response = await checkoutApi({
                ...shippingDetails,
                items: activeSessionRef.current ? undefined : cartItems
            })
            const savedOrder = ensureRecord(response?.order, 'order')

            if (activeSessionRef.current) {
                setOrders((currentOrders) => [savedOrder, ...currentOrders])
            }
            setCartItems([])
            if (!activeSessionRef.current) {
                clearGuestCartItems()
            }

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
    }, [cartItems])

    const handleMarkOrdersAsSeen = useCallback(async () => {
        if (!isAdminRef.current) return
        if (requiresEmailVerificationRef.current) return
        if (offlineFeatureMessageRef.current) return

        try {
            const response = await markOrdersAsSeenApi()
            setOrders(ensureArray(response?.orders))
        } catch (error) {
            logStoreError(error)
        }
    }, [])

    const handleUpdateOrderStatus = useCallback(async (orderId, nextStatus) => {
        if (!isAdminRef.current) {
            return {
                ok: false,
                message: 'Only admins can update order status.'
            }
        }

        if (requiresEmailVerificationRef.current) {
            return {
                ok: false,
                message: emailVerificationRequiredMessage
            }
        }

        const msg = offlineFeatureMessageRef.current
        if (msg) {
            return {
                ok: false,
                message: msg
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
    }, [])

    const handleDeleteOrder = useCallback(async (orderId) => {
        if (!isAdminRef.current) {
            return {
                ok: false,
                message: 'Only admins can remove orders.'
            }
        }

        if (requiresEmailVerificationRef.current) {
            return {
                ok: false,
                message: emailVerificationRequiredMessage
            }
        }

        const msg = offlineFeatureMessageRef.current
        if (msg) {
            return {
                ok: false,
                message: msg
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
    }, [])

    return {
        products,
        cartItems,
        categories,
        orders,
        isCatalogLoading,
        catalogError,
        serverHealth,
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
