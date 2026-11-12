import { useEffect, useState } from 'react'
import { Download, Smartphone } from 'lucide-react'
import { SettingsSection } from './SettingsSection'

type InstallEvent = Event & { prompt: () => Promise<void> }

const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true

export function InstallApp() {
  const [installEvent, setInstallEvent] = useState<InstallEvent | null>(null)
  const [installed, setInstalled] = useState(isStandalone)

  useEffect(() => {
    const onPrompt = (event: Event) => {
      event.preventDefault()
      setInstallEvent(event as InstallEvent)
    }
    const onInstalled = () => setInstalled(true)
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  if (installed) return null

  return (
    <SettingsSection
      icon={Smartphone}
      title="Instalar la app"
      description="Ábrela desde tu pantalla de inicio o escritorio, sin barra del navegador."
    >
      {installEvent ? (
        <button onClick={() => installEvent.prompt()} className="btn btn-primary">
          <Download size={16} strokeWidth={1.75} />
          Instalar CYB
        </button>
      ) : (
        <p className="text-sm text-muted">
          En iPhone: toca Compartir y luego «Añadir a pantalla de inicio». En Chrome o Edge:
          busca el icono de instalar en la barra de direcciones o en el menú.
        </p>
      )}
    </SettingsSection>
  )
}
