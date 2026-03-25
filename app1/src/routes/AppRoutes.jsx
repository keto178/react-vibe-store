import React from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import Home from '../Pages/Home/Home'
import SingnUp from '../componantes/SingnUp/SingnUp'
import Dashboard from '../Pages/Dashboard/Dashboard'
import PlecOurder from '../Pages/PlecOurder/PlecOurder'
import ShippingInformation from '../Pages/ShippingInformation/ShippingInformation'
import Orders from '../Pages/Orders/Orders'
import ProtectedRoute from './ProtectedRoute'

export default function AppRoutes({
    categories,
    products,
    cartItems,
    orders,
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
    return (
        <Routes>
            <Route path="/" element={<Home categories={categories} products={products} onAddToCart={onAddToCart} />} />
            <Route path="/Home" element={<Home categories={categories} products={products} onAddToCart={onAddToCart} />} />
            <Route
                path="/Cart"
                element={
                    <ProtectedRoute>
                        <PlecOurder
                            cartItems={cartItems}
                            onUpdateCartQuantity={onUpdateCartQuantity}
                            onRemoveFromCart={onRemoveFromCart}
                        />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/PlecOurder"
                element={
                    <ProtectedRoute>
                        <PlecOurder
                            cartItems={cartItems}
                            onUpdateCartQuantity={onUpdateCartQuantity}
                            onRemoveFromCart={onRemoveFromCart}
                        />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/Shipping"
                element={
                    <ProtectedRoute>
                        <ShippingInformation
                            cartItems={cartItems}
                            onPlaceOrder={onPlaceOrder}
                        />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/Orders"
                element={
                    <ProtectedRoute>
                        <Orders
                            orders={orders}
                            onMarkOrdersAsSeen={onMarkOrdersAsSeen}
                            onUpdateOrderStatus={onUpdateOrderStatus}
                            onDeleteOrder={onDeleteOrder}
                        />
                    </ProtectedRoute>
                }
            />
            <Route path="/Login" element={<SingnUp initialMode="login" />} />
            <Route path="/Signup" element={<SingnUp initialMode="signup" />} />
            <Route
                path="/Dashboard"
                element={
                    <ProtectedRoute requireAdmin>
                        <Dashboard
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
    )
}
