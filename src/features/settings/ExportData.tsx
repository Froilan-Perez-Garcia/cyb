import { useState } from 'react'
import { Download, FileDown, LoaderCircle } from 'lucide-react'
import { downloadCsv } from '../../lib/csv'
import { datasets } from './datasets'
import { SettingsSection } from './SettingsSection'

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
    <SettingsSection
      icon={FileDown}
      title="Tus datos"
      description="Descarga una copia en CSV, que se abre en Excel o Google Sheets."
    >
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,8.5rem),1fr))] gap-2.5">
        {datasets.map((dataset) => (
          <button
            key={dataset.id}
            onClick={() => run(dataset)}
            disabled={busyId !== null}
            className="btn btn-secondary"
          >
            {busyId === dataset.id ? (
              <LoaderCircle size={16} className="animate-spin" />
            ) : (
              <Download size={16} strokeWidth={1.75} />
            )}
            {dataset.label}
          </button>
        ))}
      </div>
      {error && (
        <p role="alert" className="text-sm text-expense">
          {error}
        </p>
      )}
    </SettingsSection>
  )
}
