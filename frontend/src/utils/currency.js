const CURRENCY_LABEL = '\u062c\u0646\u064a\u0647 \u0645\u0635\u0631\u064a'

export function formatPrice(value) {
    const numericValue = Number(value) || 0

    return `${numericValue.toFixed(2)} ${CURRENCY_LABEL}`
}

export { CURRENCY_LABEL }
