import { lazy, Suspense, useState, type FormEvent } from 'react'
import { Eye, EyeOff, LoaderCircle } from 'lucide-react'
import { ColorMenu } from '../../components/ColorMenu'
import { Logo } from '../../components/Logo'
import { supabase } from '../../lib/supabase'

const ParticleBackdrop = lazy(() => import('../../components/ParticleBackdrop'))

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [message, setMessage] = useState('')
  const [failed, setFailed] = useState(false)
  const [visible, setVisible] = useState(false)
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
    if (error) {
      setMessage(error.message)
      setFailed(true)
    } else if (mode === 'signup') {
      setMessage('Revisa tu correo para confirmar tu cuenta.')
      setFailed(false)
    }
    setBusy(false)
  }

  const login = mode === 'login'

  return (
    <div data-theme="dark" className="relative min-h-screen overflow-hidden bg-bg text-text">
      <Suspense fallback={null}>
        <ParticleBackdrop />
      </Suspense>

      <Logo className="absolute left-6 top-6 z-10 md:left-10 md:top-10" />

      <div className="absolute bottom-6 left-6 z-20 md:bottom-10 md:left-10">
        <ColorMenu
          placement="top"
          className="h-11 w-11 rounded-full border border-border bg-surface/60 backdrop-blur-sm"
        />
      </div>

      <main className="relative z-10 flex min-h-screen items-center justify-center px-5 py-24 lg:justify-start lg:py-0 lg:pl-[9vw]">
        <form
          onSubmit={submit}
          className="w-full max-w-sm animate-slide-in space-y-6 rounded-2xl border border-border bg-surface/60 p-6 shadow-float backdrop-blur-sm md:p-8 lg:bg-surface/75 lg:backdrop-blur-md"
        >
          <div className="space-y-1.5">
            <h1 className="text-3xl font-semibold">{login ? 'Bienvenido' : 'Crea tu cuenta'}</h1>
            <p className="text-sm text-muted">
              {login ? 'Entra para ver tus deudas y tu plan.' : 'Empieza a registrar tus deudas.'}
            </p>
          </div>

          <div className="space-y-4">
            <label className="field-label">
              <span>Correo</span>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="input"
              />
            </label>
            <label className="field-label">
              <span>Contraseña</span>
              <span className="relative block">
                <input
                  type={visible ? 'text' : 'password'}
                  required
                  minLength={8}
                  autoComplete={login ? 'current-password' : 'new-password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="input pr-11"
                />
                <button
                  type="button"
                  onClick={() => setVisible(!visible)}
                  aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  className="btn-icon absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2"
                >
                  {visible ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </span>
            </label>
          </div>

          {message && (
            <p
              role="status"
              className={`animate-slide-in rounded-xl border px-3.5 py-2.5 text-sm ${
                failed
                  ? 'border-expense/30 bg-expense/10 text-expense'
                  : 'border-accent/30 bg-accent/10 text-accent'
              }`}
            >
              {message}
            </p>
          )}

          <div className="space-y-3">
            <button disabled={busy} className="btn btn-primary w-full py-3">
              {busy && <LoaderCircle size={16} className="animate-spin" />}
              {login ? 'Entrar' : 'Crear cuenta'}
            </button>
            <button
              type="button"
              onClick={() => {
                setMode(login ? 'signup' : 'login')
                setMessage('')
              }}
              className="btn btn-quiet w-full"
            >
              {login ? 'No tengo cuenta' : 'Ya tengo cuenta'}
            </button>
          </div>
        </form>
      </main>
    </div>
  )
}
