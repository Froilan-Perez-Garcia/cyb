import { LogOut, UserRound } from 'lucide-react'
import { useAuth } from '../../app/useAuth'
import { PageHeader } from '../../components/PageHeader'
import { supabase } from '../../lib/supabase'
import { DeleteAccount } from './DeleteAccount'
import { ExportData } from './ExportData'
import { SettingsSection } from './SettingsSection'
import { TwoFactor } from './TwoFactor'

export default function AjustesPage() {
  const { session } = useAuth()

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader title="Ajustes" />

      <SettingsSection icon={UserRound} title="Cuenta" description="Sesión iniciada como">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="min-w-0 truncate font-medium">{session?.user.email}</p>
          <button onClick={() => supabase.auth.signOut()} className="btn btn-secondary">
            <LogOut size={16} strokeWidth={1.75} />
            Cerrar sesión
          </button>
        </div>
      </SettingsSection>

      <TwoFactor />
      <ExportData />
      <DeleteAccount />
    </div>
  )
}
