const KEY = 'cyb-hue'
const DEFAULT_HUE = 174

export const presets = [
  { name: 'Turquesa', hue: 174 },
  { name: 'Cian', hue: 190 },
  { name: 'Azul', hue: 217 },
  { name: 'Índigo', hue: 245 },
  { name: 'Violeta', hue: 270 },
  { name: 'Rosa', hue: 330 },
  { name: 'Rojo', hue: 355 },
  { name: 'Naranja', hue: 24 },
  { name: 'Ámbar', hue: 42 },
  { name: 'Lima', hue: 90 },
  { name: 'Verde', hue: 145 },
]

export const unitRgb = (h: number, s: number, l: number) => {
  const a = (s / 100) * Math.min(l / 100, 1 - l / 100)
  const f = (n: number) => {
    const k = (n + h / 30) % 12
    return l / 100 - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))
  }
  return [f(0), f(8), f(4)]
}

const channels = (h: number, s: number, l: number) =>
  unitRgb(h, s, l)
    .map((v) => Math.round(v * 255))
    .join(' ')

export const darkBg = (hue: number) => channels(hue, 36, 5.5)

export const hueFromHex = (hex: string) => {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  const max = Math.max(r, g, b)
  const d = max - Math.min(r, g, b)
  if (d === 0) return DEFAULT_HUE
  const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4
  return Math.round((h * 60 + 360) % 360)
}

export const hueToHex = (hue: number) => {
  const [r, g, b] = channels(hue, 70, 50).split(' ').map(Number)
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`
}

export const readHue = () => {
  try {
    const value = Number(localStorage.getItem(KEY))
    return localStorage.getItem(KEY) !== null && value >= 0 && value < 360 ? value : DEFAULT_HUE
  } catch {
    return DEFAULT_HUE
  }
}

let current = DEFAULT_HUE

export const getHue = () => current

export const applyHue = (hue: number) => {
  current = hue
  let style = document.getElementById('cyb-accent')
  if (!style) {
    style = document.createElement('style')
    style.id = 'cyb-accent'
    document.head.appendChild(style)
  }
  const c = (s: number, l: number) => channels(hue, s, l)
  const shared = `--rail-accent:${c(77, 64)};--rail-text:${c(25, 90)};--rail-muted:${c(14, 62)}`
  style.textContent = `:root{--accent:${c(77, 27)};--text:${c(35, 9)};--rail:${c(58, 13)};${shared}}
[data-theme='dark']{--accent:${c(66, 50)};--bg:${darkBg(hue)};--surface:${c(29, 9)};--raised:${c(26, 12.5)};--border:${c(22, 17.5)};--text:${c(18, 92)};--muted:${c(12, 61)};--rail:${c(50, 6.5)};${shared}}`
}

export const saveHue = (hue: number) => {
  applyHue(hue)
  try {
    localStorage.setItem(KEY, String(hue))
  } catch {
    return
  }
}
