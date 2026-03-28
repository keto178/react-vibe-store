import React, { Suspense, lazy } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import Home from '../Pages/Home/Home'
import ProtectedRoute from './ProtectedRoute'

const SingnUp = lazy(() => import('../componantes/SingnUp/SingnUp'))
const Dashboard = lazy(() => import('../Pages/Dashboard/Dashboard'))
const PlecOurder = lazy(() => import('../Pages/PlecOurder/PlecOurder'))
const ShippingInformation = lazy(() => import('../Pages/ShippingInformation/ShippingInformation'))
const Orders = lazy(() => import('../Pages/Orders/Orders'))
const PhoneVerification = lazy(() => import('../Pages/PhoneVerification/PhoneVerification'))

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
                        <Home
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
                        <Home
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
                        <PlecOurder
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
                        <PlecOurder
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
                            <ShippingInformation
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
                            <Orders
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
                            <PhoneVerification activeSession={activeSession} />
                        </ProtectedRoute>
                    }
                />
                <Route path="/Login" element={<SingnUp initialMode="login" />} />
                <Route path="/Signup" element={<SingnUp initialMode="signup" />} />
                <Route
                    path="/Dashboard"
                    element={
                        <ProtectedRoute activeSession={activeSession} requireAdmin>
                            <Dashboard
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
