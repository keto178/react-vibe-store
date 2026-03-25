import { clearActiveSession, getAuthToken } from './auth'
import {
    isApiReachabilityError,
    loginWithFallbackAuth,
    registerWithFallbackAuth
} from './localAuthFallback'

function normalizeBaseUrl(url) {
    return url.replace(/\/$/, '')
}

function resolveApiBaseUrl() {
    const configuredBaseUrl = import.meta.env.VITE_API_URL

    if (configuredBaseUrl) {
        return normalizeBaseUrl(configuredBaseUrl)
    }

    if (typeof window !== 'undefined') {
        const { hostname, port, protocol } = window.location
        const isLocalHost = hostname === 'localhost' || hostname === '127.0.0.1'

        if (protocol === 'file:' || (isLocalHost && port !== '5000')) {
            return `http://${hostname === '127.0.0.1' ? '127.0.0.1' : 'localhost'}:5000/api`
        }
    }

    return '/api'
}

const API_BASE_URL = resolveApiBaseUrl()

function createUnexpectedApiResponseError(message) {
    return new Error(message || 'The API returned an unexpected response.')
}

async function readApiResponse(response) {
    if (response.status === 204) {
        return null
    }

    const contentType = response.headers.get('content-type') || ''

    if (contentType.includes('application/json')) {
        try {
            return await response.json()
        } catch {
            throw createUnexpectedApiResponseError(
                'The API returned invalid JSON. Check the server deployment and try again.'
            )
        }
    }

    const text = (await response.text()).trim()

    if (!response.ok) {
        return { message: text || 'Request failed.' }
    }

    if (!text) {
        return null
    }

    const isHtmlResponse = contentType.includes('text/html') || /^<!doctype html>|^<html/i.test(text)

    throw createUnexpectedApiResponseError(
        isHtmlResponse
            ? 'The API returned HTML instead of JSON. Check the Vercel API routing and environment variables.'
            : 'The API returned an unexpected non-JSON response.'
    )
}

async function apiRequest(path, options = {}) {
    const token = getAuthToken()
    const headers = {
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers
    }

    let response

    try {
        response = await fetch(`${API_BASE_URL}${path}`, {
            method: options.method || 'GET',
            headers,
            body: options.body ? JSON.stringify(options.body) : undefined
        })
    } catch {
        throw new Error(
            'Cannot reach the API server. Make sure the backend is running on http://localhost:5000, the server/.env file exists, and MongoDB is started.'
        )
    }

    if (response.status === 401) {
        clearActiveSession()
    }

    const data = await readApiResponse(response)

    if (!response.ok) {
        throw new Error(data?.message || 'Request failed.')
    }

    return data || {}
}

export function registerUserApi(payload) {
    return apiRequest('/auth/register', {
        method: 'POST',
        body: payload
    }).catch((error) => {
        if (!isApiReachabilityError(error)) {
            throw error
        }

        return registerWithFallbackAuth(payload)
    })
}

export function loginUserApi(payload) {
    return apiRequest('/auth/login', {
        method: 'POST',
        body: payload
    }).catch((error) => {
        if (!isApiReachabilityError(error)) {
            throw error
        }

        return loginWithFallbackAuth(payload)
    })
}

export function fetchCategoriesApi() {
    return apiRequest('/categories')
}

export function createCategoryApi(payload) {
    return apiRequest('/categories', {
        method: 'POST',
        body: payload
    })
}

export function updateCategoryApi(categoryId, payload) {
    return apiRequest(`/categories/${categoryId}`, {
        method: 'PUT',
        body: payload
    })
}

export function deleteCategoryApi(categoryId) {
    return apiRequest(`/categories/${categoryId}`, {
        method: 'DELETE'
    })
}

export function fetchProductsApi() {
    return apiRequest('/products')
}

export function createProductApi(payload) {
    return apiRequest('/products', {
        method: 'POST',
        body: payload
    })
}

export function updateProductApi(productId, payload) {
    return apiRequest(`/products/${productId}`, {
        method: 'PUT',
        body: payload
    })
}

export function deleteProductApi(productId) {
    return apiRequest(`/products/${productId}`, {
        method: 'DELETE'
    })
}

export function fetchCartApi() {
    return apiRequest('/cart')
}

export function addCartItemApi(payload) {
    return apiRequest('/cart/items', {
        method: 'POST',
        body: payload
    })
}

export function updateCartItemApi(itemId, payload) {
    return apiRequest(`/cart/items/${itemId}`, {
        method: 'PATCH',
        body: payload
    })
}

export function removeCartItemApi(itemId) {
    return apiRequest(`/cart/items/${itemId}`, {
        method: 'DELETE'
    })
}

export function checkoutApi(payload) {
    return apiRequest('/orders/checkout', {
        method: 'POST',
        body: payload
    })
}

export function fetchUserOrdersApi() {
    return apiRequest('/orders/me')
}

export function fetchAdminOrdersApi() {
    return apiRequest('/orders')
}

export function markOrdersAsSeenApi() {
    return apiRequest('/orders/mark-seen', {
        method: 'PATCH'
    })
}

export function updateOrderStatusApi(orderId, status) {
    return apiRequest(`/orders/${orderId}/status`, {
        method: 'PATCH',
        body: { status }
    })
}

export function deleteOrderApi(orderId) {
    return apiRequest(`/orders/${orderId}`, {
        method: 'DELETE'
    })
}
