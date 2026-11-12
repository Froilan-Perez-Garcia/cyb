import { CreditCard } from 'lucide-react'
import { useDebtsVisible } from '../debts/useDebtsVisible'
import { setDebtsModule } from '../../lib/modules'
import { SettingsSection } from './SettingsSection'

export function DebtsToggle() {
  const { visible, hasDebts } = useDebtsVisible()

  return (
    <SettingsSection
      icon={CreditCard}
      title="Control de deudas"
      description="Tarjetas, préstamos y plan de pago. Si no lo necesitas, la app se queda solo con tu flujo de dinero."
    >
      <label className="flex cursor-pointer items-center gap-3 text-sm">
        <input
          type="checkbox"
          checked={visible}
          disabled={hasDebts}
          onChange={(event) => setDebtsModule(event.target.checked)}
          className="h-4 w-4 accent-[rgb(var(--accent))]"
        />
        {hasDebts ? 'Activado (tienes deudas registradas)' : 'Activar control de deudas'}
      </label>
    </SettingsSection>
  )
}
