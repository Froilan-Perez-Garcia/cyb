import { useState, type FormEvent } from 'react'
import { supabase } from '../../lib/supabase'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setMessage('')
    const credentials = { email, password }
    const { error } =
      mode === 'login'
        ? await supabase.auth.signInWithPassword(credentials)
        : await supabase.auth.signUp(credentials)
    if (error) setMessage(error.message)
    else if (mode === 'signup') setMessage('Revisa tu correo para confirmar tu cuenta.')
    setBusy(false)
  }

  const input =
    'w-full rounded-lg border border-border bg-bg px-3 py-2 outline-none focus:border-accent'

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <form
        onSubmit={submit}
        className="w-full max-w-sm space-y-4 rounded-2xl border border-border bg-surface p-6"
      >
        <h1 className="text-2xl font-bold text-accent">CYB</h1>
        <p className="text-sm text-muted">Check your bills</p>
        <label className="block space-y-1 text-sm">
          <span>Correo</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={input}
          />
        </label>
        <label className="block space-y-1 text-sm">
          <span>Contraseña</span>
          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={input}
          />
        </label>
        {message && <p className="text-sm text-expense">{message}</p>}
        <button
          disabled={busy}
          className="w-full rounded-lg bg-accent px-3 py-2 font-medium text-bg disabled:opacity-60"
        >
          {mode === 'login' ? 'Entrar' : 'Crear cuenta'}
        </button>
        <button
          type="button"
          onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
          className="w-full text-sm text-muted hover:text-text"
        >
          {mode === 'login' ? 'No tengo cuenta' : 'Ya tengo cuenta'}
        </button>
      </form>
    </div>
  )
}
