export const NICOTINE_OPTIONS = [9, 12, 30, 50]
export const MAX_NICOTINE_LEVELS = 2

export function sanitizeNicotineLevels(levels) {
    if (!Array.isArray(levels)) {
        return []
    }

    return Array.from(
        new Set(
            levels
                .map((level) => Number(level))
                .filter((level) => NICOTINE_OPTIONS.includes(level))
        )
    )
        .sort((firstLevel, secondLevel) => firstLevel - secondLevel)
        .slice(0, MAX_NICOTINE_LEVELS)
}

export function formatNicotineLevel(level) {
    return `${level} mg`
}
