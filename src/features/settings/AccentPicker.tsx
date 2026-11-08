import { Palette } from 'lucide-react'
import { AccentSwatches } from '../../components/AccentSwatches'
import { SettingsSection } from './SettingsSection'

export function AccentPicker() {
  return (
    <SettingsSection
      icon={Palette}
      title="Color principal"
      description="Elige el color de la app. Se aplica al instante y se guarda en este dispositivo."
    >
      <AccentSwatches />
    </SettingsSection>
  )
}
