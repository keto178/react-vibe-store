import React from 'react'
import './App.css'
import Navpar from './componantes/NavPar/NavPar'
import { getActiveSession } from './utils/auth'
import AppRoutes from './routes/AppRoutes'
import { useAppStore } from './hooks/useAppStore'

function App() {
  const activeSession = getActiveSession()
  const {
    products,
    cartItems,
    categories,
    orders,
    cartCount,
    unreadOrdersCount,
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
  } = useAppStore(activeSession)

  return (
    <div className="App">
      <Navpar cartCount={cartCount} unreadOrdersCount={unreadOrdersCount} />
      <main className="app-content">
        <AppRoutes
          categories={categories}
          products={products}
          cartItems={cartItems}
          orders={orders}
          onAddToCart={handleAddToCart}
          onUpdateCartQuantity={handleUpdateCartQuantity}
          onRemoveFromCart={handleRemoveFromCart}
          onPlaceOrder={handlePlaceOrder}
          onMarkOrdersAsSeen={handleMarkOrdersAsSeen}
          onUpdateOrderStatus={handleUpdateOrderStatus}
          onDeleteOrder={handleDeleteOrder}
          onAddCategory={handleAddCategory}
          onUpdateCategory={handleUpdateCategory}
          onDeleteCategory={handleDeleteCategory}
          onAddProduct={handleAddProduct}
          onUpdateProduct={handleUpdateProduct}
          onDeleteProduct={handleDeleteProduct}
        />
      </main>
    </div>
  )
}

export default App
