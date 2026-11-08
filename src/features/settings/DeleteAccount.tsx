import { useEffect, useState, type FormEvent } from 'react'
import { LoaderCircle, Trash2, TriangleAlert } from 'lucide-react'
import { Portal } from '../../components/Portal'
import { supabase } from '../../lib/supabase'
import { SettingsSection } from './SettingsSection'

const WORD = 'ELIMINAR'

export function DeleteAccount() {
  const [open, setOpen] = useState(false)
  const [typed, setTyped] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && !busy && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, busy])

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (typed !== WORD) return
    setBusy(true)
    setError('')
    const { error: deleteError } = await supabase.rpc('delete_my_account')
    if (deleteError) {
      setError(deleteError.message)
      setBusy(false)
      return
    }
    await supabase.auth.signOut({ scope: 'local' })
  }

  return (
    <SettingsSection
      icon={Trash2}
      title="Eliminar mi cuenta"
      description="Borra tu cuenta y todos tus datos de forma permanente. Descarga antes una copia si la necesitas."
      danger
    >
      <button
        onClick={() => {
          setTyped('')
          setError('')
          setOpen(true)
        }}
        className="btn btn-danger"
      >
        Eliminar mi cuenta
      </button>

      {open && (
        <Portal>
          <div
            className="overlay"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-title"
          >
            <form onSubmit={submit} className="sheet max-w-sm">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-expense/10 text-expense">
                <TriangleAlert size={20} strokeWidth={1.75} />
              </span>
              <div className="space-y-1.5">
                <h2 id="delete-title" className="text-lg font-semibold">
                  ¿Eliminar tu cuenta para siempre?
                </h2>
                <p className="text-sm text-muted">
                  Se borrarán tus deudas, abonos, movimientos, recurrentes y categorías. No se puede
                  deshacer. Para confirmar, escribe <strong className="text-text">{WORD}</strong>.
                </p>
              </div>
              <input
                value={typed}
                onChange={(event) => setTyped(event.target.value)}
                aria-label={`Escribe ${WORD} para confirmar`}
                autoFocus
                autoComplete="off"
                className="input input-danger"
              />
              {error && (
                <p role="alert" className="text-sm text-expense">
                  {error}
                </p>
              )}
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  disabled={busy}
                  className="btn btn-secondary"
                >
                  Cancelar
                </button>
                <button disabled={busy || typed !== WORD} className="btn btn-danger-solid">
                  {busy && <LoaderCircle size={16} className="animate-spin" />}
                  {busy ? 'Eliminando…' : 'Eliminar para siempre'}
                </button>
              </div>
            </form>
          </div>
        </Portal>
      )}
    </SettingsSection>
  )
}
