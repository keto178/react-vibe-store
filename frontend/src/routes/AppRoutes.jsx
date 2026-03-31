import React, { Suspense, lazy } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import HomePage from '../pages/home/HomePage'
import ProtectedRoute from './ProtectedRoute'

const AuthPage = lazy(() => import('../pages/auth/AuthPage'))
const DashboardPage = lazy(() => import('../pages/dashboard/DashboardPage'))
const CartPage = lazy(() => import('../pages/cart/CartPage'))
const ShippingPage = lazy(() => import('../pages/shipping/ShippingPage'))
const OrdersPage = lazy(() => import('../pages/orders/OrdersPage'))
const PhoneVerificationPage = lazy(() => import('../pages/phone-verification/PhoneVerificationPage'))

export default function AppRoutes({
    activeSession,
    categories = [],
    products = [],
    isCatalogLoading = false,
    catalogError = '',
    serverHealth,
    cartItems = [],
    orders = [],
    onAddToCart,
    onUpdateCartQuantity,
    onRemoveFromCart,
    onPlaceOrder,
    onMarkOrdersAsSeen,
    onUpdateOrderStatus,
    onDeleteOrder,
    onAddCategory,
    onUpdateCategory,
    onDeleteCategory,
    onAddProduct,
    onUpdateProduct,
    onDeleteProduct
}) {
    const routeFallback = (
        <section className='route-loading' aria-live="polite">
            Loading page...
        </section>
    )

    return (
        <Suspense fallback={routeFallback}>
            <Routes>
                <Route
                    path="/"
                    element={(
                        <HomePage
                            categories={categories}
                            products={products}
                            onAddToCart={onAddToCart}
                            isCatalogLoading={isCatalogLoading}
                            catalogError={catalogError}
                        />
                    )}
                />
                <Route
                    path="/Home"
                    element={(
                        <HomePage
                            categories={categories}
                            products={products}
                            onAddToCart={onAddToCart}
                            isCatalogLoading={isCatalogLoading}
                            catalogError={catalogError}
                        />
                    )}
                />
                <Route
                    path="/Cart"
                    element={
                        <CartPage
                            activeSession={activeSession}
                            cartItems={cartItems}
                            onUpdateCartQuantity={onUpdateCartQuantity}
                            onRemoveFromCart={onRemoveFromCart}
                        />
                    }
                />
                <Route
                    path="/PlecOurder"
                    element={
                        <CartPage
                            activeSession={activeSession}
                            cartItems={cartItems}
                            onUpdateCartQuantity={onUpdateCartQuantity}
                            onRemoveFromCart={onRemoveFromCart}
                        />
                    }
                />
                <Route
                    path="/Shipping"
                    element={
                        <ProtectedRoute activeSession={activeSession}>
                            <ShippingPage
                                key={activeSession?.id || 'guest-shipping'}
                                activeSession={activeSession}
                                cartItems={cartItems}
                                onPlaceOrder={onPlaceOrder}
                            />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/Orders"
                    element={
                        <ProtectedRoute activeSession={activeSession}>
                            <OrdersPage
                                activeSession={activeSession}
                                orders={orders}
                                onMarkOrdersAsSeen={onMarkOrdersAsSeen}
                                onUpdateOrderStatus={onUpdateOrderStatus}
                                onDeleteOrder={onDeleteOrder}
                            />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/VerifyPhone"
                    element={
                        <ProtectedRoute activeSession={activeSession} requirePhoneVerificationComplete={false}>
                            <PhoneVerificationPage activeSession={activeSession} />
                        </ProtectedRoute>
                    }
                />
                <Route path="/Login" element={<AuthPage initialMode="login" />} />
                <Route path="/Signup" element={<AuthPage initialMode="signup" />} />
                <Route
                    path="/Dashboard"
                    element={
                        <ProtectedRoute activeSession={activeSession} requireAdmin>
                            <DashboardPage
                                activeSession={activeSession}
                                serverHealth={serverHealth}
                                categories={categories}
                                products={products}
                                onAddCategory={onAddCategory}
                                onUpdateCategory={onUpdateCategory}
                                onDeleteCategory={onDeleteCategory}
                                onAddProduct={onAddProduct}
                                onUpdateProduct={onUpdateProduct}
                                onDeleteProduct={onDeleteProduct}
                            />
                        </ProtectedRoute>
                    }
                />
                <Route path="*" element={<Navigate to="/Home" replace />} />
            </Routes>
        </Suspense>
    )
}
