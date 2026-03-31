import { buildRuntimeHealth } from '../services/healthService.js'

export function getHealth(req, res) {
    res.json(buildRuntimeHealth())
}
