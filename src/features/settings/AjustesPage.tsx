import { useAuth } from '../../app/useAuth'
import { supabase } from '../../lib/supabase'
import { DeleteAccount } from './DeleteAccount'
import { ExportData } from './ExportData'
import { TwoFactor } from './TwoFactor'

export default function AjustesPage() {
  const { session } = useAuth()

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-2xl font-bold">Ajustes</h1>

      <section className="space-y-3 rounded-2xl border border-border bg-surface p-4">
        <p className="text-sm text-muted">Sesión iniciada como</p>
        <p className="font-medium">{session?.user.email}</p>
        <button
          onClick={() => supabase.auth.signOut()}
          className="rounded-lg border border-border px-4 py-2 text-sm text-muted hover:text-expense"
        >
          Cerrar sesión
        </button>
      </section>

      <TwoFactor />
      <ExportData />
      <DeleteAccount />
    </div>
  )
}
