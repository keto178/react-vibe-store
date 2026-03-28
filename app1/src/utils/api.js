import { clearActiveSession, getAuthToken } from './auth'

const AUTH_INVALIDATION_MESSAGES = new Set([
    'Authentication is required.',
    'Your session is invalid or expired. Please log in again.',
    'The account for this session no longer exists.'
])

function normalizeBaseUrl(url) {
    return url.replace(/\/$/, '')
}

function isLoopbackHostname(hostname = '') {
    return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]'
}

function addApiBaseUrlCandidate(candidates, value) {
    if (!value) {
        return
    }

    const normalizedValue = normalizeBaseUrl(value)

    if (!normalizedValue || candidates.includes(normalizedValue)) {
        return
    }

    candidates.push(normalizedValue)
}

function resolveApiBaseUrls() {
    const candidates = []
    const configuredBaseUrl = import.meta.env.VITE_API_URL

    if (configuredBaseUrl) {
        let shouldUseConfiguredBaseUrl = true

        if (typeof window !== 'undefined') {
            try {
                const configuredUrl = new URL(configuredBaseUrl, window.location.origin)
                const currentHostname = window.location.hostname
                const configuredHostname = configuredUrl.hostname

                if (!isLoopbackHostname(currentHostname) && isLoopbackHostname(configuredHostname)) {
                    shouldUseConfiguredBaseUrl = false
                }
            } catch {
                // Keep configured value if parsing fails.
            }
        }

        if (shouldUseConfiguredBaseUrl) {
            addApiBaseUrlCandidate(candidates, configuredBaseUrl)
        }
    }

    if (typeof window !== 'undefined') {
        const { hostname, port, protocol } = window.location
        const isLocalHost = isLoopbackHostname(hostname)

        if (protocol === 'file:' || (isLocalHost && port !== '5000')) {
            addApiBaseUrlCandidate(candidates, `http://${hostname === '127.0.0.1' ? '127.0.0.1' : 'localhost'}:5000/api`)
        }
    }

    addApiBaseUrlCandidate(candidates, '/api')

    return candidates
}

const API_BASE_URL_CANDIDATES = resolveApiBaseUrls()

function createUnexpectedApiResponseError(message) {
    return new Error(message || 'The API returned an unexpected response.')
}

function logApiError(context, details) {
    console.error(`[api] ${context}`, details)
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
    const method = options.method || 'GET'
    const headers = {
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers
    }

    let response = null
    let usedApiBaseUrl = ''
    let lastNetworkError = null

    for (const baseUrl of API_BASE_URL_CANDIDATES) {
        try {
            response = await fetch(`${baseUrl}${path}`, {
                method,
                headers,
                body: options.body ? JSON.stringify(options.body) : undefined
            })
            usedApiBaseUrl = baseUrl
            break
        } catch (networkError) {
            lastNetworkError = networkError

            logApiError('Network request failed.', {
                method,
                path,
                baseUrl,
                errorMessage: networkError.message
            })
        }
    }

    if (!response) {
        throw new Error(
            `Cannot reach the API server. Tried: ${API_BASE_URL_CANDIDATES.join(', ')}. ${lastNetworkError?.message || ''}`.trim()
        )
    }

    let data

    try {
        data = await readApiResponse(response)
    } catch (parseError) {
        logApiError('Response parsing failed.', {
            method,
            path,
            baseUrl: usedApiBaseUrl,
            status: response.status,
            errorMessage: parseError.message
        })
        throw parseError
    }

    const shouldClearSession = (
        response.status === 401 &&
        Boolean(token) &&
        AUTH_INVALIDATION_MESSAGES.has(data?.message)
    )

    if (shouldClearSession) {
        clearActiveSession()
    }

    if (!response.ok) {
        const isExpectedSessionRefresh401 = method === 'GET' && path === '/auth/me' && response.status === 401

        if (!isExpectedSessionRefresh401) {
            logApiError('API response error.', {
                method,
                path,
                baseUrl: usedApiBaseUrl,
                status: response.status,
                statusText: response.statusText,
                message: data?.message || 'Request failed.',
                response: data
            })
        }

        throw new Error(data?.message || 'Request failed.')
    }

    return data || {}
}

export function registerUserApi(payload) {
    return apiRequest('/auth/register', {
        method: 'POST',
        body: payload
    })
}

export function loginUserApi(payload) {
    return apiRequest('/auth/login', {
        method: 'POST',
        body: payload
    })
}

export function fetchCurrentUserApi() {
    return apiRequest('/auth/me')
}

export function requestPhoneVerificationCodeApi(payload) {
    return apiRequest('/auth/phone/request-code', {
        method: 'POST',
        body: payload
    })
}

export function verifyPhoneVerificationCodeApi(payload) {
    return apiRequest('/auth/phone/verify-code', {
        method: 'POST',
        body: payload
    })
}

export function uploadAssetApi(payload) {
    return apiRequest('/uploads', {
        method: 'POST',
        body: payload
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
