import app from './app.js'
import env from './config/env.js'
import { bootstrapApplication } from './app/bootstrap.js'

async function startServer() {
    const bootstrapSummary = await bootstrapApplication()

    app.listen(env.port, () => {
        console.log(
            `API server running on http://localhost:${env.port} with MongoDB and ${bootstrapSummary.objectStorage.mode} object storage`
        )
    })
}

startServer().catch((error) => {
    console.error('Failed to start the API server.')
    console.error(error)
    process.exit(1)
})
