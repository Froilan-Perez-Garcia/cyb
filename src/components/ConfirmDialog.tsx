import { useEffect, useRef } from 'react'
import { TriangleAlert } from 'lucide-react'
import { Portal } from './Portal'

type Props = {
  title: string
  message: string
  confirmLabel: string
  busy: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({ title, message, confirmLabel, busy, onConfirm, onCancel }: Props) {
  const cancelRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    cancelRef.current?.focus()
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onCancel()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onCancel])

  return (
    <Portal>
      <div
        className="overlay"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-message"
      >
        <div className="sheet max-w-sm">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-expense/10 text-expense">
            <TriangleAlert size={20} strokeWidth={1.75} />
          </span>
          <div className="space-y-1.5">
            <h2 id="confirm-title" className="text-lg font-semibold">
              {title}
            </h2>
            <p id="confirm-message" className="text-sm text-muted">
              {message}
            </p>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button ref={cancelRef} onClick={onCancel} className="btn btn-secondary">
              Cancelar
            </button>
            <button onClick={onConfirm} disabled={busy} className="btn btn-danger-solid">
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </Portal>
  )
}
