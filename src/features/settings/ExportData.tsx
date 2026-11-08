import { useState } from 'react'
import { downloadCsv } from '../../lib/csv'
import { datasets } from './datasets'

export function ExportData() {
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState('')

  const run = async (dataset: (typeof datasets)[number]) => {
    setBusyId(dataset.id)
    setError('')
    try {
      downloadCsv(dataset.file, await dataset.build())
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudo exportar')
    }
    setBusyId(null)
  }

  return (
    <section className="space-y-3 rounded-2xl border border-border bg-surface p-4">
      <div>
        <h2 className="font-semibold">Tus datos</h2>
        <p className="text-sm text-muted">
          Descarga una copia en CSV, que se abre en Excel o Google Sheets.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {datasets.map((dataset) => (
          <button
            key={dataset.id}
            onClick={() => run(dataset)}
            disabled={busyId !== null}
            className="rounded-lg border border-border px-4 py-2 text-sm text-muted transition-colors hover:border-accent hover:text-accent disabled:opacity-60"
          >
            {busyId === dataset.id ? 'Preparando…' : dataset.label}
          </button>
        ))}
      </div>
      {error && <p className="text-sm text-expense">{error}</p>}
    </section>
  )
}
