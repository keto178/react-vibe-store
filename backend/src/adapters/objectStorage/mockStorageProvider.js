function createDataUrlFromBuffer(buffer, mimeType = 'application/octet-stream') {
    return `data:${mimeType};base64,${buffer.toString('base64')}`
}

export function createMockStorageProvider() {
    return {
        name: 'mock',

        async upload({ dataUrl, buffer, bytes, mimeType }) {
            return {
                url: dataUrl || createDataUrlFromBuffer(buffer, mimeType),
                storage: 'mock',
                publicId: '',
                bytes: bytes || buffer?.byteLength || 0,
                mimeType
            }
        }
    }
}
