function buildSvgDataUri(label, background, foreground = '#ffffff') {
    const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 220">
            <defs>
                <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stop-color="${background}" />
                    <stop offset="100%" stop-color="#111827" />
                </linearGradient>
            </defs>
            <rect width="320" height="220" fill="url(#g)" rx="28" ry="28" />
            <circle cx="270" cy="48" r="30" fill="rgba(255,255,255,0.14)" />
            <circle cx="54" cy="176" r="42" fill="rgba(255,255,255,0.12)" />
            <text x="34" y="118" fill="${foreground}" font-size="28" font-family="Arial, sans-serif" font-weight="700">
                ${label}
            </text>
        </svg>
    `

    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg.trim())}`
}

export const DEFAULT_CATEGORIES = [
    {
        id: 'cat-default-starter-kits',
        name: 'Starter Kits',
        group: 'Device',
        image: buildSvgDataUri('Starter Kits', '#0f766e')
    },
    {
        id: 'cat-default-pod-systems',
        name: 'Pod Systems',
        group: 'Device',
        image: buildSvgDataUri('Pod Systems', '#1d4ed8')
    },
    {
        id: 'cat-default-fruit-liquids',
        name: 'Fruit Liquids',
        group: 'Liquid',
        image: buildSvgDataUri('Fruit Liquids', '#f97316')
    },
    {
        id: 'cat-default-menthol-liquids',
        name: 'Menthol Liquids',
        group: 'Liquid',
        image: buildSvgDataUri('Menthol Liquids', '#0ea5e9')
    }
]
