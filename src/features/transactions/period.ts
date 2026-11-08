export type View = 'dia' | 'quincena' | 'mes'

export const toIso = (date: Date) => date.toLocaleDateString('en-CA')

export const parseIso = (iso: string) => {
  const [year, month, day] = iso.split('-').map(Number)
  return new Date(year, month - 1, day)
}

export function getRange(view: View, anchor: Date) {
  const year = anchor.getFullYear()
  const month = anchor.getMonth()
  const day = anchor.getDate()
  if (view === 'dia') return { from: toIso(anchor), to: toIso(anchor) }
  if (view === 'mes') {
    return { from: toIso(new Date(year, month, 1)), to: toIso(new Date(year, month + 1, 0)) }
  }
  return day <= 15
    ? { from: toIso(new Date(year, month, 1)), to: toIso(new Date(year, month, 15)) }
    : { from: toIso(new Date(year, month, 16)), to: toIso(new Date(year, month + 1, 0)) }
}

export function shift(view: View, anchor: Date, direction: 1 | -1) {
  const year = anchor.getFullYear()
  const month = anchor.getMonth()
  const day = anchor.getDate()
  if (view === 'dia') return new Date(year, month, day + direction)
  if (view === 'mes') return new Date(year, month + direction, 1)
  if (day <= 15) return direction === 1 ? new Date(year, month, 16) : new Date(year, month - 1, 16)
  return direction === 1 ? new Date(year, month + 1, 1) : new Date(year, month, 1)
}

export function periodLabel(view: View, anchor: Date) {
  const month = anchor.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })
  if (view === 'mes') return month
  if (view === 'dia') {
    return anchor.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })
  }
  const first = anchor.getDate() <= 15
  const last = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0).getDate()
  return `${first ? '1' : '16'}–${first ? '15' : last} de ${month}`
}

export const dayLabel = (iso: string) =>
  parseIso(iso).toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })
