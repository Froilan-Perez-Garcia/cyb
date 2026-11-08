import { useEffect, useState } from 'react'
import { Reorder } from 'framer-motion'
import { orderDebts, type Method, type PlanDebt } from './engine'

const options: { id: Method; title: string; text: string }[] = [
  {
    id: 'avalancha',
    title: 'Avalancha',
    text: 'Pagas primero la deuda con mayor interés. Es la que menos interés total te cuesta.',
  },
  {
    id: 'bola_de_nieve',
    title: 'Bola de nieve',
    text: 'Pagas primero la deuda más pequeña. Liquidas deudas pronto y te mantienes motivado.',
  },
  {
    id: 'personalizado',
    title: 'Personalizado',
    text: 'Tú decides el orden según tu situación, porque solo tú conoces el trasfondo de cada deuda.',
  },
]

type Props = {
  debts: PlanDebt[]
  current: Method
  dismissible: boolean
  saving: boolean
  onConfirm: (method: Method, orderedIds: string[]) => void
  onClose: () => void
}

export function MethodModal({ debts, current, dismissible, saving, onConfirm, onClose }: Props) {
  const [method, setMethod] = useState<Method>(current)
  const [order, setOrder] = useState(() => orderDebts(debts, 'personalizado'))

  useEffect(() => {
    if (!dismissible) return
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [dismissible, onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex animate-fade-in items-end justify-center bg-black/60 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="method-title"
    >
      <div className="max-h-full w-full max-w-lg space-y-4 overflow-y-auto animate-pop-in rounded-2xl border border-border bg-surface p-5">
        <div>
          <h2 id="method-title" className="text-xl font-bold">
            ¿Cómo quieres atacar tus deudas?
          </h2>
          <p className="text-sm text-muted">Puedes cambiarlo cuando quieras.</p>
        </div>

        <div className="space-y-2">
          {options.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setMethod(option.id)}
              aria-pressed={method === option.id}
              className={`w-full rounded-xl border p-3 text-left transition-colors ${
                method === option.id ? 'border-accent bg-accent/10' : 'border-border'
              }`}
            >
              <span className="font-semibold">
                {option.title}
                {option.id === 'avalancha' && (
                  <span className="ml-2 text-xs font-normal text-accent">recomendado</span>
                )}
              </span>
              <span className="mt-1 block text-sm text-muted">{option.text}</span>
            </button>
          ))}
        </div>

        {method === 'personalizado' && (
          <div className="space-y-2">
            <p className="text-sm text-muted">Arrastra para ordenar: la primera se paga antes.</p>
            <Reorder.Group axis="y" values={order} onReorder={setOrder} className="space-y-2">
              {order.map((debt, index) => (
                <Reorder.Item
                  key={debt.id}
                  value={debt}
                  className="flex cursor-grab touch-none items-center gap-3 rounded-lg border border-border bg-bg px-3 py-2 text-sm active:cursor-grabbing"
                >
                  <span className="w-5 text-muted">{index + 1}</span>
                  <span className="font-medium">{debt.alias}</span>
                  <span className="ml-auto text-muted" aria-hidden="true">
                    ⠿
                  </span>
                </Reorder.Item>
              ))}
            </Reorder.Group>
          </div>
        )}

        <div className="flex justify-end gap-2">
          {dismissible && (
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-border px-4 py-2 text-sm text-muted hover:text-text"
            >
              Cancelar
            </button>
          )}
          <button
            type="button"
            disabled={saving}
            onClick={() =>
              onConfirm(
                method,
                order.map((debt) => debt.id),
              )
            }
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-bg disabled:opacity-60"
          >
            Usar este método
          </button>
        </div>
      </div>
    </div>
  )
}
