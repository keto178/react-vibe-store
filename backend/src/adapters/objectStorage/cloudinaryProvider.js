import { createHash, randomUUID } from 'node:crypto'

function getSafeFileStem(fileName = '') {
    return String(fileName || 'file')
        .trim()
        .replace(/\.[^/.]+$/, '')
        .replace(/[^a-zA-Z0-9_-]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 80) || 'file'
}

function normalizeScope(scope = '') {
    return String(scope || 'uploads')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9/_-]+/g, '-')
        .replace(/\/+/g, '/')
        .replace(/^-|-$/g, '') || 'uploads'
}

function createCloudinarySignature(params, apiSecret) {
    const signatureBase = Object.entries(params)
        .filter(([, value]) => value !== undefined && value !== null && value !== '')
        .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
        .map(([key, value]) => `${key}=${value}`)
        .join('&')

    return createHash('sha1')
        .update(`${signatureBase}${apiSecret}`)
        .digest('hex')
}

export function createCloudinaryProvider(env) {
    return {
        name: 'cloudinary',

        async upload({ dataUrl, buffer, fileName = '', scope = 'uploads', mimeType }) {
            const timestamp = Math.floor(Date.now() / 1000)
            const folder = `${String(env.cloudinaryFolder || 'react-work').replace(/\/+$/, '')}/${normalizeScope(scope)}`
            const publicId = `${folder}/${getSafeFileStem(fileName)}-${randomUUID().slice(0, 10)}`
            const signature = createCloudinarySignature({
                folder,
                public_id: publicId,
                timestamp
            }, env.cloudinaryApiSecret)
            const formData = new FormData()

            if (dataUrl) {
                formData.set('file', dataUrl)
            } else if (Buffer.isBuffer(buffer) && buffer.byteLength > 0) {
                formData.set('file', new Blob([buffer], {
                    type: mimeType || 'application/octet-stream'
                }), fileName || 'upload')
            } else {
                throw new Error('Cloudinary upload requires a valid file payload.')
            }
            formData.set('api_key', env.cloudinaryApiKey)
            formData.set('timestamp', String(timestamp))
            formData.set('folder', folder)
            formData.set('public_id', publicId)
            formData.set('signature', signature)

            const response = await fetch(
                `https://api.cloudinary.com/v1_1/${env.cloudinaryCloudName}/auto/upload`,
                {
                    method: 'POST',
                    body: formData
                }
            )
            const payload = await response.json().catch(() => ({}))

            if (!response.ok || !payload?.secure_url) {
                throw new Error(payload?.error?.message || 'Cloudinary rejected the upload.')
            }

            return {
                url: payload.secure_url,
                storage: 'cloudinary',
                publicId: payload.public_id || '',
                bytes: Number(payload.bytes) || 0,
                mimeType: mimeType || payload.format || 'application/octet-stream'
            }
        }
    }
}
