import React, { useRef } from 'react'
import './Header.css'

const SMOKE_LAYERS = [
    { id: 'one', x: 10, y: 18, size: 230, opacity: 0.42, blur: 26, duration: '11s', rotate: '-10deg' },
    { id: 'two', x: 88, y: 16, size: 210, opacity: 0.38, blur: 28, duration: '13s', rotate: '14deg' },
    { id: 'three', x: 7, y: 74, size: 260, opacity: 0.34, blur: 34, duration: '15s', rotate: '8deg' },
    { id: 'four', x: 92, y: 72, size: 250, opacity: 0.36, blur: 30, duration: '12s', rotate: '-16deg' },
    { id: 'five', x: 48, y: 6, size: 200, opacity: 0.26, blur: 24, duration: '10s', rotate: '0deg' }
]

export default function Header({ productsCount, categoriesCount, hasProducts, onBrowseProducts }) {
    const headerRef = useRef(null)
    const smokeRefs = useRef([])

    const updateSmokeOffsets = (clientX, clientY) => {
        const headerElement = headerRef.current

        if (!headerElement) {
            return
        }

        const bounds = headerElement.getBoundingClientRect()
        const pointerX = clientX - bounds.left
        const pointerY = clientY - bounds.top
        const influenceRadius = Math.max(bounds.width, bounds.height) * 0.4

        smokeRefs.current.forEach((smokeElement, index) => {
            if (!smokeElement) {
                return
            }

            const anchorX = (Number(smokeElement.dataset.x) / 100) * bounds.width
            const anchorY = (Number(smokeElement.dataset.y) / 100) * bounds.height
            const dx = anchorX - pointerX
            const dy = anchorY - pointerY
            const distance = Math.hypot(dx, dy) || 1
            const force = Math.max(0, (influenceRadius - distance) / influenceRadius)
            const maxOffset = 42 + (index * 4)
            const offsetX = (dx / distance) * force * maxOffset
            const offsetY = (dy / distance) * force * maxOffset

            smokeElement.style.setProperty('--smoke-shift-x', `${offsetX.toFixed(2)}px`)
            smokeElement.style.setProperty('--smoke-shift-y', `${offsetY.toFixed(2)}px`)
        })
    }

    const resetSmokeOffsets = () => {
        smokeRefs.current.forEach((smokeElement) => {
            if (!smokeElement) {
                return
            }

            smokeElement.style.setProperty('--smoke-shift-x', '0px')
            smokeElement.style.setProperty('--smoke-shift-y', '0px')
        })
    }

    const handlePointerMove = (event) => {
        const headerElement = headerRef.current

        if (!headerElement) {
            return
        }

        const bounds = headerElement.getBoundingClientRect()
        const relativeX = ((event.clientX - bounds.left) / bounds.width) - 0.5
        const relativeY = ((event.clientY - bounds.top) / bounds.height) - 0.5

        headerElement.style.setProperty('--pointer-x', relativeX.toFixed(4))
        headerElement.style.setProperty('--pointer-y', relativeY.toFixed(4))
        updateSmokeOffsets(event.clientX, event.clientY)
    }

    const resetPointer = () => {
        const headerElement = headerRef.current

        if (!headerElement) {
            return
        }

        headerElement.style.setProperty('--pointer-x', '0')
        headerElement.style.setProperty('--pointer-y', '0')
        resetSmokeOffsets()
    }

    return (
        <section
            ref={headerRef}
            className='header-container'
            onPointerMove={handlePointerMove}
            onPointerLeave={resetPointer}
        >
            <div className='header-smoke-field'>
                {SMOKE_LAYERS.map((layer, index) => (
                    <div
                        key={layer.id}
                        ref={(element) => {
                            smokeRefs.current[index] = element
                        }}
                        className={`header-smoke header-smoke-${layer.id}`}
                        data-x={layer.x}
                        data-y={layer.y}
                        style={{
                            '--smoke-left': layer.x,
                            '--smoke-top': layer.y,
                            '--smoke-size': `${layer.size}px`,
                            '--smoke-opacity': layer.opacity,
                            '--smoke-blur': `${layer.blur}px`,
                            '--smoke-duration': layer.duration,
                            '--smoke-rotate': layer.rotate
                        }}
                    />
                ))}
            </div>
            <div className='header-background'>
                <div className='header-grid-glow' />
                <div className='header-orb header-orb-one' />
                <div className='header-orb header-orb-two' />
                <div className='header-orb header-orb-three' />
                <div className='header-rings' />
                <div className='header-noise' />
            </div>
            <div className='header-overlay' />
            <div className='header-container-item'>
                <p className='header-badge'>Premium Vape Store</p>
                <h1>Vape devices and liquids, presented in a cleaner home experience.</h1>
                <p className='header-description'>
                    Browse products added by the admin dashboard, explore vivid product cards, and keep the storefront ready for the next launch.
                </p>
                <div className='header-actions'>
                    <button type="button" onClick={onBrowseProducts}>
                        {hasProducts ? 'Browse Products' : 'View Collection Area'}
                    </button>
                    <span className='header-note'>Admin products sync instantly to the home page.</span>
                </div>
            </div>

            <div className='header-highlight-card'>
                <p className='header-highlight-label'>Store Snapshot</p>
                <div className='header-highlight-grid'>
                    <div className='header-highlight-box'>
                        <span>Products</span>
                        <strong>{productsCount}</strong>
                    </div>
                    <div className='header-highlight-box'>
                        <span>Categories</span>
                        <strong>{categoriesCount || 2}</strong>
                    </div>
                </div>
                <p className='header-highlight-copy'>
                    {hasProducts
                        ? 'Your latest inventory is already live below.'
                        : 'Once the admin adds products, the collection will appear below.'}
                </p>
            </div>
        </section>
    )
}
