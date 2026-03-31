import { spawn } from 'node:child_process'

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm'

function runProcess(label, command, options = {}) {
    const child = spawn(command, {
        stdio: 'inherit',
        shell: true,
        ...options
    })

    child.on('exit', (code) => {
        if (code !== 0) {
            console.error(`${label} exited with code ${code}`)
        }
    })

    return child
}

const serverProcess = runProcess(
    'server',
    `${npmCommand} run dev:backend`,
    { cwd: process.cwd() }
)

const clientProcess = runProcess(
    'client',
    `${npmCommand} run dev:frontend`,
    { cwd: process.cwd() }
)

function shutdown() {
    serverProcess.kill('SIGINT')
    clientProcess.kill('SIGINT')
    process.exit(0)
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
