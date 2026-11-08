export type Column<T> = { label: string; value: (row: T) => string | number | null }

const BOM = String.fromCharCode(0xfeff)

const cell =(value: string | number | null) => {
  const raw = value === null ? '' : String(value)
  const safe = typeof value === 'string' && /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe
}

export function toCsv<T>(rows: T[], columns: Column<T>[]) {
  const header = columns.map((column) => cell(column.label)).join(',')
  const lines = rows.map((row) => columns.map((column) => cell(column.value(row))).join(','))
  return `${BOM}${[header, ...lines].join('\r\n')}`
}

export function downloadCsv(filename: string, csv: string) {
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
