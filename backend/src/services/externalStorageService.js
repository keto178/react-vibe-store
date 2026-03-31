export {
    assertManagedAssetUrl as assertExternalAssetUrl,
    getUploadStorageMode as getExternalStorageMode,
    isSupportedAssetUrl as isExternalAssetUrl,
    readLegacyBlobAsset,
    sanitizePersistedUploadMetadata,
    supportsLegacyBlobAssetReads,
    uploadAssetFromBuffer as storeAssetFromBuffer,
    uploadAssetFromDataUrl as storeAssetFromDataUrl
} from '../app/services/uploadService.js'

export function isExternalStorageRequired() {
    return true
}
