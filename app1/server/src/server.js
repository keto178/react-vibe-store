import app from './app.js'
import { connectToDatabase } from './config/db.js'
import env from './config/env.js'
import fileApp, { prepareFileApi } from './fileApp.js'
import { seedDefaults } from './services/seedService.js'

async function startServer() {
    let selectedApp = app
    let storageMode = 'mongodb'

    try {
        await connectToDatabase()
        await seedDefaults()
    } catch (error) {
        storageMode = 'file'
        selectedApp = fileApp
        await prepareFileApi()
        console.warn('MongoDB is unavailable. Falling back to file storage for local development.')
        console.warn(error.message)
    }

    selectedApp.listen(env.port, () => {
        console.log(`API server running on http://localhost:${env.port} using ${storageMode} storage`)
    })
}

startServer().catch((error) => {
    console.error('Failed to start the API server.')
    console.error(error)
    process.exit(1)
})
