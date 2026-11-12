import { lazy, Suspense, useState, type FormEvent } from 'react'
import { Eye, EyeOff, LoaderCircle, X } from 'lucide-react'
import { ColorMenu } from '../../components/ColorMenu'
import { Logo } from '../../components/Logo'
import { readProfiles, removeProfile, saveProfile } from '../../lib/profiles'
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
  const [profiles, setProfiles] = useState(readProfiles)
  const [other, setOther] = useState(false)
  const [remember, setRemember] = useState(true)

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
    } else if (mode === 'login') {
      if (remember) saveProfile(email)
    } else {
      setMessage('Revisa tu correo para confirmar tu cuenta.')
      setFailed(false)
    }
    setBusy(false)
  }

  const login = mode === 'login'
  const picking = login && profiles.length > 0 && !other
  const card =
    'w-full max-w-sm animate-slide-in space-y-6 rounded-2xl border border-border bg-surface/60 p-6 shadow-float backdrop-blur-sm md:p-8 lg:bg-surface/75 lg:backdrop-blur-md'

  const choose = (profile: string) => {
    setEmail(profile)
    setPassword('')
    setOther(true)
  }

  const forget = (profile: string) => setProfiles(removeProfile(profile))

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
        {picking ? (
          <div className={card}>
            <div className="space-y-1.5">
              <h1 className="text-3xl font-semibold">Elige tu perfil</h1>
              <p className="text-sm text-muted">Toca tu cuenta para entrar más rápido.</p>
            </div>
            <ul className="space-y-2">
              {profiles.map((profile) => (
                <li key={profile} className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => choose(profile)}
                    className="flex min-w-0 flex-1 items-center gap-3 rounded-xl border border-border bg-raised/60 p-3 text-left transition-[border-color,transform] duration-200 hover:border-accent/60 active:scale-[0.98]"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent/15 text-base font-semibold uppercase text-accent">
                      {profile.charAt(0)}
                    </span>
                    <span className="min-w-0 truncate text-sm font-medium">{profile}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => forget(profile)}
                    aria-label={`Quitar ${profile}`}
                    title="Quitar este perfil"
                    className="btn-icon shrink-0 hover:text-expense"
                  >
                    <X size={16} />
                  </button>
                </li>
              ))}
            </ul>
            <button type="button" onClick={() => setOther(true)} className="btn btn-quiet w-full">
              Usar otra cuenta
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className={card}>
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
                    autoFocus={email !== ''}
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
              {login && (
                <label className="flex cursor-pointer items-center gap-2.5 text-sm text-muted">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(event) => setRemember(event.target.checked)}
                    className="h-4 w-4 accent-[rgb(var(--accent))]"
                  />
                  Recordar este perfil en este dispositivo
                </label>
              )}
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
              {login && profiles.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setOther(false)
                    setEmail('')
                    setPassword('')
                    setMessage('')
                  }}
                  className="btn btn-quiet w-full"
                >
                  Volver a mis perfiles
                </button>
              )}
            </div>
          </form>
        )}
      </main>
    </div>
  )
}
