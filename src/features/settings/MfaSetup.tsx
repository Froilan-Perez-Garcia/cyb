import { ShieldCheck } from 'lucide-react'
import { AuthLayout } from '../../components/AuthLayout'
import { supabase } from '../../lib/supabase'
import { TotpEnroll } from './TotpEnroll'

export function MfaSetup({ onDone }: { onDone: () => void }) {
  return (
    <AuthLayout>
      <div className="space-y-6">
        <div className="space-y-4">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/10 text-accent">
            <ShieldCheck size={24} strokeWidth={1.75} />
          </span>
          <div className="space-y-1.5">
            <h1 className="text-3xl font-semibold">Protege tu cuenta</h1>
            <p className="text-sm text-muted">
              La verificación en dos pasos es obligatoria. Necesitas una app de autenticación como
              Google Authenticator, Authy o 1Password.
            </p>
          </div>
        </div>

        <TotpEnroll onDone={onDone} startLabel="Configurar ahora" />

        <button
          type="button"
          onClick={() => supabase.auth.signOut()}
          className="btn btn-quiet w-full"
        >
          Usar otra cuenta
        </button>
      </div>
    </AuthLayout>
  )
}
