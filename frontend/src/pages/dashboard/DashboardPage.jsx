import React from 'react'
import './DashboardPage.css'
import DashboardHeader from './components/DashboardHeader'
import CategorySection from './components/CategorySection'
import ProductSection from './components/ProductSection'
import ProductListSection from './components/ProductListSection'
import { useDashboardManager } from './useDashboardManager'

export default function DashboardPage(props) {
    const {
        activeUser,
        handleLogout,
        categoryCount,
        productCount,
        serverHealth,
        isReadOnly,
        readOnlyMessage,
        categorySectionProps,
        productSectionProps,
        productListProps
    } = useDashboardManager(props)

    if (!activeUser) {
        return null
    }

    return (
        <section className='dashboard-page'>
            <div className='dashboard-card'>
                <DashboardHeader
                    categoriesCount={categoryCount}
                    productsCount={productCount}
                    serverHealth={serverHealth}
                    isReadOnly={isReadOnly}
                    readOnlyMessage={readOnlyMessage}
                    onLogout={handleLogout}
                />
                <CategorySection {...categorySectionProps} />
                <ProductSection {...productSectionProps} />
                <ProductListSection {...productListProps} />
            </div>
        </section>
    )
}
