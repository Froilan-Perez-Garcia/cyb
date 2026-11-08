import { useState, type FormEvent } from 'react'
import { LoaderCircle, ShieldCheck } from 'lucide-react'
import { AuthLayout } from '../../components/AuthLayout'
import { supabase } from '../../lib/supabase'
import { verifyCode } from './mfa'

export function MfaChallenge({ onVerified }: { onVerified: () => void }) {
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      const { data, error: listError } = await supabase.auth.mfa.listFactors()
      if (listError) throw listError
      const factor = data.totp[0]
      if (!factor) throw new Error('No hay un método de verificación activo')
      await verifyCode(factor.id, code.trim())
      onVerified()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Código incorrecto')
      setCode('')
    }
    setBusy(false)
  }

  return (
    <AuthLayout>
      <form onSubmit={submit} className="space-y-6">
        <div className="space-y-4">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/10 text-accent">
            <ShieldCheck size={24} strokeWidth={1.75} />
          </span>
          <div className="space-y-1.5">
            <h1 className="text-3xl font-semibold">Verificación en dos pasos</h1>
            <p className="text-sm text-muted">
              Escribe el código de 6 dígitos que muestra tu app de autenticación.
            </p>
          </div>
        </div>

        <label className="field-label">
          <span>Código</span>
          <input
            value={code}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
            inputMode="numeric"
            autoComplete="one-time-code"
            autoFocus
            required
            minLength={6}
            maxLength={6}
            className="input py-3.5 text-center text-2xl font-semibold tracking-[0.5em]"
          />
        </label>

        {error && (
          <p
            role="alert"
            className="animate-slide-in rounded-xl border border-expense/30 bg-expense/10 px-3.5 py-2.5 text-sm text-expense"
          >
            {error}
          </p>
        )}

        <div className="space-y-3">
          <button disabled={busy || code.length !== 6} className="btn btn-primary w-full py-3">
            {busy && <LoaderCircle size={16} className="animate-spin" />}
            Verificar
          </button>
          <button
            type="button"
            onClick={() => supabase.auth.signOut()}
            className="btn btn-quiet w-full"
          >
            Usar otra cuenta
          </button>
        </div>
      </form>
    </AuthLayout>
  )
}
