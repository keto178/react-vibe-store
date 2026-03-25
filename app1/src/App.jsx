import React, { useEffect } from 'react'
import './App.css'
import Navpar from './componantes/NavPar/NavPar'
import { saveActiveSession } from './utils/auth'
import AppRoutes from './routes/AppRoutes'
import { useAppStore } from './hooks/useAppStore'
import { useActiveSession } from './hooks/useActiveSession'
import { fetchCurrentUserApi } from './utils/api'

function App() {
  const activeSession = useActiveSession()
  const sessionToken = activeSession?.token || ''
  const sessionAuthMode = activeSession?.authMode || ''
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

  useEffect(() => {
    let isCancelled = false

    if (!sessionToken || sessionAuthMode === 'fallback') {
      return undefined
    }

    async function syncActiveSession() {
      try {
        const response = await fetchCurrentUserApi()

        if (isCancelled || !response?.user) {
          return
        }

        saveActiveSession({
          token: sessionToken,
          authMode: sessionAuthMode,
          user: response.user
        })
      } catch (error) {
        const shouldLogError = ![
          'Authentication is required.',
          'Your session is invalid or expired. Please log in again.',
          'The account for this session no longer exists.'
        ].includes(error?.message)

        if (import.meta.env.DEV && shouldLogError) {
          console.error(error)
        }
      }
    }

    syncActiveSession()

    return () => {
      isCancelled = true
    }
  }, [sessionAuthMode, sessionToken])

  return (
    <div className="App">
      <Navpar
        activeSession={activeSession}
        cartCount={cartCount}
        unreadOrdersCount={unreadOrdersCount}
      />
      <main className="app-content">
        <AppRoutes
          activeSession={activeSession}
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
