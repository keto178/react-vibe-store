import { createHash } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import mongoose from 'mongoose'
import { connectToDatabase } from '../src/config/db.js'
import Category from '../src/app/models/Category.js'
import Product from '../src/app/models/Product.js'
import { uploadAssetFromDataUrl } from '../src/app/services/uploadService.js'

const DATA_URL_PREFIX = 'data:'
const DEFAULT_OUTPUT_DIRECTORY = path.resolve(process.cwd(), 'data', 'migration-reports')

function parseArgs(argv) {
    const options = {
        mode: 'dry-run',
        output: '',
        limit: 0
    }

    for (const arg of argv) {
        if (arg === '--dry-run') {
            options.mode = 'dry-run'
            continue
        }

        if (arg === '--execute') {
            options.mode = 'execute'
            continue
        }

        if (arg === '--verify') {
            options.mode = 'verify'
            continue
        }

        if (arg.startsWith('--mode=')) {
            options.mode = arg.slice('--mode='.length)
            continue
        }

        if (arg.startsWith('--output=')) {
            options.output = arg.slice('--output='.length)
            continue
        }

        if (arg.startsWith('--limit=')) {
            options.limit = Math.max(0, Math.floor(Number(arg.slice('--limit='.length)) || 0))
        }
    }

    if (!['dry-run', 'execute', 'verify'].includes(options.mode)) {
        throw new Error('Mode must be one of: dry-run, execute, verify.')
    }

    return options
}

function isDataUrl(value = '') {
    return String(value || '').trim().startsWith(DATA_URL_PREFIX)
}

function getDataUrlMetadata(dataUrl = '') {
    const normalizedValue = String(dataUrl || '')
    const commaIndex = normalizedValue.indexOf(',')
    const headerEndIndex = commaIndex >= 0 ? commaIndex + 1 : Math.min(normalizedValue.length, 80)
    const header = normalizedValue.slice(0, Math.min(headerEndIndex, 160))
    const mimeMatch = normalizedValue.match(/^data:([^;,]+)?(;base64)?,/)
    const isBase64 = Boolean(mimeMatch?.[2])
    const payload = commaIndex >= 0 ? normalizedValue.slice(commaIndex + 1) : ''
    let estimatedBytes = Math.floor((payload.length * 3) / 4)

    if (!isBase64) {
        try {
            estimatedBytes = Buffer.byteLength(decodeURIComponent(payload), 'utf8')
        } catch {
            estimatedBytes = Buffer.byteLength(payload, 'utf8')
        }
    }

    return {
        hash: createHash('sha256').update(normalizedValue).digest('hex'),
        mimeType: mimeMatch?.[1] || 'application/octet-stream',
        estimatedBytes,
        headerPreview: header.replace(/,[\s\S]*$/, ',...')
    }
}

function getSafeRecordName(record, fallbackName) {
    return String(record?.name || fallbackName || 'asset')
        .trim()
        .replace(/[^a-zA-Z0-9_-]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 80) || 'asset'
}

function getFileExtension(mimeType = '') {
    switch (String(mimeType || '').toLowerCase()) {
    case 'image/jpeg':
        return '.jpg'
    case 'image/png':
        return '.png'
    case 'image/webp':
        return '.webp'
    case 'image/gif':
        return '.gif'
    case 'image/svg+xml':
        return '.svg'
    case 'image/avif':
        return '.avif'
    default:
        return ''
    }
}

async function findLegacyAssets(Model, type, limit) {
    const query = {
        image: {
            $type: 'string',
            $regex: '^data:'
        }
    }
    const cursor = Model.find(query).select('name image imageMetadata').sort({ _id: 1 })

    if (limit > 0) {
        cursor.limit(limit)
    }

    const records = await cursor

    return records.map((record) => {
        const metadata = getDataUrlMetadata(record.image)

        return {
            type,
            record,
            id: record._id.toString(),
            name: record.name || '',
            oldHash: metadata.hash,
            mimeType: metadata.mimeType,
            estimatedBytes: metadata.estimatedBytes,
            headerPreview: metadata.headerPreview
        }
    })
}

function summarizeAssets(assets) {
    const totalEstimatedBytes = assets.reduce((sum, asset) => sum + asset.estimatedBytes, 0)

    return {
        count: assets.length,
        totalEstimatedBytes,
        totalEstimatedKb: Math.round(totalEstimatedBytes / 1024)
    }
}

async function buildReportPath(outputPath) {
    if (outputPath) {
        return path.resolve(process.cwd(), outputPath)
    }

    await mkdir(DEFAULT_OUTPUT_DIRECTORY, { recursive: true })
    return path.join(
        DEFAULT_OUTPUT_DIRECTORY,
        `data-url-asset-migration-${new Date().toISOString().replace(/[:.]/g, '-')}.json`
    )
}

async function writeReport(outputPath, report) {
    const reportPath = await buildReportPath(outputPath)
    await mkdir(path.dirname(reportPath), { recursive: true })
    await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
    return reportPath
}

async function migrateAsset(asset) {
    const { record, type, oldHash, mimeType } = asset

    if (!isDataUrl(record.image)) {
        return {
            status: 'skipped',
            reason: 'Image is no longer a data URL.'
        }
    }

    const fileName = `${getSafeRecordName(record, type)}-${oldHash.slice(0, 10)}${getFileExtension(mimeType)}`
    const uploadResult = await uploadAssetFromDataUrl({
        dataUrl: record.image,
        fileName,
        scope: `migrations/${type}`
    })

    if (!uploadResult?.url) {
        throw new Error('Upload did not return a URL.')
    }

    record.image = uploadResult.url
    record.imageMetadata = uploadResult.assetMetadata || null
    await record.save()

    return {
        status: 'migrated',
        newUrl: uploadResult.url,
        imageMetadata: uploadResult.assetMetadata || null
    }
}

async function runDryRun(options) {
    const [categoryAssets, productAssets] = await Promise.all([
        findLegacyAssets(Category, 'categories', options.limit),
        findLegacyAssets(Product, 'products', options.limit)
    ])
    const allAssets = [...categoryAssets, ...productAssets]
    const report = {
        mode: 'dry-run',
        generatedAt: new Date().toISOString(),
        summary: {
            categories: summarizeAssets(categoryAssets),
            products: summarizeAssets(productAssets),
            total: summarizeAssets(allAssets)
        },
        plannedChanges: allAssets.map((asset) => ({
            type: asset.type,
            id: asset.id,
            name: asset.name,
            oldHash: asset.oldHash,
            mimeType: asset.mimeType,
            estimatedBytes: asset.estimatedBytes,
            headerPreview: asset.headerPreview,
            action: 'upload data URL to configured object storage and replace image with returned URL'
        }))
    }

    const reportPath = await writeReport(options.output, report)

    console.info('[migration] Dry run completed.', {
        categoriesWithDataUrl: categoryAssets.length,
        productsWithDataUrl: productAssets.length,
        totalEstimatedKb: report.summary.total.totalEstimatedKb,
        reportPath
    })
}

async function runExecute(options) {
    const [categoryAssets, productAssets] = await Promise.all([
        findLegacyAssets(Category, 'categories', options.limit),
        findLegacyAssets(Product, 'products', options.limit)
    ])
    const allAssets = [...categoryAssets, ...productAssets]
    const results = []

    for (const asset of allAssets) {
        try {
            const result = await migrateAsset(asset)
            results.push({
                type: asset.type,
                id: asset.id,
                name: asset.name,
                oldHash: asset.oldHash,
                mimeType: asset.mimeType,
                estimatedBytes: asset.estimatedBytes,
                ...result
            })
            console.info('[migration] Asset processed.', {
                type: asset.type,
                id: asset.id,
                status: result.status
            })
        } catch (error) {
            results.push({
                type: asset.type,
                id: asset.id,
                name: asset.name,
                oldHash: asset.oldHash,
                mimeType: asset.mimeType,
                estimatedBytes: asset.estimatedBytes,
                status: 'failed',
                errorMessage: error.message
            })
            console.error('[migration] Asset migration failed.', {
                type: asset.type,
                id: asset.id,
                errorMessage: error.message
            })
        }
    }

    const report = {
        mode: 'execute',
        generatedAt: new Date().toISOString(),
        summary: {
            categories: summarizeAssets(categoryAssets),
            products: summarizeAssets(productAssets),
            total: summarizeAssets(allAssets),
            migrated: results.filter((result) => result.status === 'migrated').length,
            failed: results.filter((result) => result.status === 'failed').length,
            skipped: results.filter((result) => result.status === 'skipped').length
        },
        results
    }
    const reportPath = await writeReport(options.output, report)

    console.info('[migration] Execute completed.', {
        migrated: report.summary.migrated,
        failed: report.summary.failed,
        skipped: report.summary.skipped,
        reportPath
    })
}

async function runVerify() {
    const [categoriesRemaining, productsRemaining] = await Promise.all([
        Category.countDocuments({ image: { $type: 'string', $regex: '^data:' } }),
        Product.countDocuments({ image: { $type: 'string', $regex: '^data:' } })
    ])

    console.info('[migration] Verification completed.', {
        categoriesRemaining,
        productsRemaining,
        isComplete: categoriesRemaining === 0 && productsRemaining === 0
    })

    if (categoriesRemaining > 0 || productsRemaining > 0) {
        process.exitCode = 2
    }
}

async function main() {
    const options = parseArgs(process.argv.slice(2))

    await connectToDatabase()

    if (options.mode === 'dry-run') {
        await runDryRun(options)
    } else if (options.mode === 'execute') {
        await runExecute(options)
    } else {
        await runVerify()
    }
}

main()
    .catch((error) => {
        console.error('[migration] Failed.', {
            errorMessage: error.message,
            code: error.code || ''
        })
        process.exitCode = 1
    })
    .finally(async () => {
        await mongoose.disconnect()
    })
