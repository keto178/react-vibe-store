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

export function useAppStore(activeSession) {
    const [products, setProducts] = useState([])
    const [cartItems, setCartItems] = useState([])
    const [categories, setCategories] = useState([])
    const [orders, setOrders] = useState([])

    const isAdmin = isDashboardOwner(activeSession)
    const sessionId = activeSession?.id || ''
    const sessionRole = activeSession?.role || ''
    const hasSession = Boolean(sessionId)
    const isFallbackSession = activeSession?.authMode === 'fallback'
    const offlineFeatureMessage = 'Backend is not running. Start the API server to use this feature.'

    const refreshCatalog = async () => {
        const [categoriesResponse, productsResponse] = await Promise.all([
            fetchCategoriesApi(),
            fetchProductsApi()
        ])

        setCategories(categoriesResponse.categories)
        setProducts(productsResponse.products)
    }

    const refreshCart = async () => {
        if (!activeSession) {
            setCartItems([])
            return
        }

        const response = await fetchCartApi()
        setCartItems(response.items)
    }

    useEffect(() => {
        let isCancelled = false

        async function loadStore() {
            try {
                const [categoriesResponse, productsResponse] = await Promise.all([
                    fetchCategoriesApi(),
                    fetchProductsApi()
                ])

                if (isCancelled) {
                    return
                }

                setCategories(categoriesResponse.categories)
                setProducts(productsResponse.products)

                if (isFallbackSession) {
                    setCartItems([])
                    setOrders([])
                    return
                }

                if (!hasSession) {
                    setCartItems([])
                    setOrders([])
                    return
                }

                const [cartResponse, ordersResponse] = await Promise.all([
                    fetchCartApi(),
                    sessionRole === 'admin' ? fetchAdminOrdersApi() : fetchUserOrdersApi()
                ])

                if (isCancelled) {
                    return
                }

                setCartItems(cartResponse.items)
                setOrders(ordersResponse.orders)
            } catch (error) {
                if (isCancelled) {
                    return
                }

                if (!hasSession) {
                    setCartItems([])
                    setOrders([])
                }

                console.error(error)
            }
        }

        loadStore()

        return () => {
            isCancelled = true
        }
    }, [hasSession, isFallbackSession, sessionId, sessionRole])

    const handleAddProduct = async (product) => {
        if (isFallbackSession) {
            throw new Error(offlineFeatureMessage)
        }

        const response = await createProductApi(product)

        setProducts((currentProducts) => [response.product, ...currentProducts])

        return response.product
    }

    const handleUpdateProduct = async (updatedProduct) => {
        if (isFallbackSession) {
            throw new Error(offlineFeatureMessage)
        }

        const response = await updateProductApi(updatedProduct.id, updatedProduct)

        setProducts((currentProducts) =>
            currentProducts.map((product) => (
                product.id === response.product.id ? response.product : product
            ))
        )

        if (activeSession) {
            await refreshCart()
        }

        return response.product
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

        setCategories((currentCategories) => [response.category, ...currentCategories])

        return response.category
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
            return {
                ok: false,
                requiresAuth: true,
                message: 'Please log in to add products to your cart.'
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

            setCartItems(response.items)

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
            return
        }

        if (isFallbackSession) {
            return
        }

        try {
            const response = nextQuantity <= 0
                ? await removeCartItemApi(cartItemId)
                : await updateCartItemApi(cartItemId, { quantity: nextQuantity })

            setCartItems(response.items)
        } catch (error) {
            console.error(error)
        }
    }

    const handleRemoveFromCart = async (cartItemId) => {
        if (!activeSession) {
            return
        }

        if (isFallbackSession) {
            return
        }

        try {
            const response = await removeCartItemApi(cartItemId)
            setCartItems(response.items)
        } catch (error) {
            console.error(error)
        }
    }

    const handlePlaceOrder = async (shippingDetails) => {
        if (!activeSession) {
            return {
                ok: false,
                message: 'Please log in before placing an order.'
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

            setOrders((currentOrders) => [response.order, ...currentOrders])
            setCartItems([])

            return {
                ok: true,
                order: response.order
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

        if (isFallbackSession) {
            return
        }

        try {
            const response = await markOrdersAsSeenApi()
            setOrders(response.orders)
        } catch (error) {
            console.error(error)
        }
    }

    const handleUpdateOrderStatus = async (orderId, nextStatus) => {
        if (!isAdmin) {
            return {
                ok: false,
                message: 'Only admins can update order status.'
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

            setOrders((currentOrders) =>
                currentOrders.map((order) => (
                    order.id === response.order.id ? response.order : order
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
        cartCount: cartItems.reduce((total, item) => total + item.quantity, 0),
        unreadOrdersCount: orders.filter((order) => order.isNew).length,
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
