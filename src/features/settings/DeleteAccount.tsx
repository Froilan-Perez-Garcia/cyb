import { useEffect, useState, type FormEvent } from 'react'
import { supabase } from '../../lib/supabase'

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
    <section className="space-y-3 rounded-2xl border border-expense/50 bg-surface p-4">
      <div>
        <h2 className="font-semibold text-expense">Eliminar mi cuenta</h2>
        <p className="text-sm text-muted">
          Borra tu cuenta y todos tus datos de forma permanente. Descarga antes una copia si la
          necesitas.
        </p>
      </div>
      <button
        onClick={() => {
          setTyped('')
          setError('')
          setOpen(true)
        }}
        className="rounded-lg border border-expense px-4 py-2 text-sm text-expense transition-colors hover:bg-expense hover:text-bg"
      >
        Eliminar mi cuenta
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex animate-fade-in items-end justify-center bg-black/60 p-4 sm:items-center"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="delete-title"
        >
          <form
            onSubmit={submit}
            className="w-full max-w-sm space-y-4 animate-pop-in rounded-2xl border border-border bg-surface p-5"
          >
            <h2 id="delete-title" className="text-lg font-bold">
              ¿Eliminar tu cuenta para siempre?
            </h2>
            <p className="text-sm text-muted">
              Se borrarán tus deudas, abonos, movimientos, recurrentes y categorías. No se puede
              deshacer. Para confirmar, escribe <strong className="text-text">{WORD}</strong>.
            </p>
            <input
              value={typed}
              onChange={(event) => setTyped(event.target.value)}
              aria-label={`Escribe ${WORD} para confirmar`}
              autoFocus
              autoComplete="off"
              className="w-full rounded-lg border border-border bg-bg px-3 py-2 outline-none focus:border-expense"
            />
            {error && <p className="text-sm text-expense">{error}</p>}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={busy}
                className="rounded-lg border border-border px-4 py-2 text-sm text-muted hover:text-text"
              >
                Cancelar
              </button>
              <button
                disabled={busy || typed !== WORD}
                className="rounded-lg bg-expense px-4 py-2 text-sm font-medium text-bg disabled:opacity-60"
              >
                {busy ? 'Eliminando…' : 'Eliminar para siempre'}
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  )
}
