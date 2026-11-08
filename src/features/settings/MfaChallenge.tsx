import { useState, type FormEvent } from 'react'
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
    <div className="flex min-h-screen items-center justify-center p-4">
      <form
        onSubmit={submit}
        className="w-full max-w-sm space-y-4 rounded-2xl border border-border bg-surface p-6"
      >
        <h1 className="text-2xl font-bold text-accent">Verificación en dos pasos</h1>
        <p className="text-sm text-muted">
          Escribe el código de 6 dígitos que muestra tu app de autenticación.
        </p>
        <label className="block space-y-1 text-sm">
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
            className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-center text-xl tracking-[0.4em] outline-none focus:border-accent"
          />
        </label>
        {error && <p className="text-sm text-expense">{error}</p>}
        <button
          disabled={busy || code.length !== 6}
          className="w-full rounded-lg bg-accent px-3 py-2 font-medium text-bg disabled:opacity-60"
        >
          Verificar
        </button>
        <button
          type="button"
          onClick={() => supabase.auth.signOut()}
          className="w-full text-sm text-muted hover:text-text"
        >
          Usar otra cuenta
        </button>
      </form>
    </div>
  )
}
