import app from '../app1/server/src/app.js'
import { connectToDatabase } from '../app1/server/src/config/db.js'
import fileApp, { prepareFileApi } from '../app1/server/src/fileApp.js'
import { seedDefaults } from '../app1/server/src/services/seedService.js'

const isVercelDeployment = process.env.VERCEL === '1'
let selectedAppPromise = null

async function resolveServerApp() {
    try {
        await connectToDatabase()
        await seedDefaults()
        return app
    } catch (error) {
        if (isVercelDeployment) {
            console.error('MongoDB connection failed inside the Vercel API function.')
            console.error(error)
            throw error
        }

        await prepareFileApi()
        return fileApp
    }
}

async function getSelectedApp() {
    if (!selectedAppPromise) {
        selectedAppPromise = resolveServerApp().catch((error) => {
            selectedAppPromise = null
            throw error
        })
    }

    return selectedAppPromise
}

export default async function handler(req, res) {
    const selectedApp = await getSelectedApp()
    return selectedApp(req, res)
}
