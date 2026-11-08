import { useEffect, useState } from 'react'
import { Reorder } from 'framer-motion'
import {
  Check,
  GripVertical,
  ListOrdered,
  Snowflake,
  TrendingDown,
  type LucideIcon,
} from 'lucide-react'
import { Portal } from '../../components/Portal'
import { orderDebts, type Method, type PlanDebt } from './engine'

const options: { id: Method; title: string; text: string; icon: LucideIcon }[] = [
  {
    id: 'avalancha',
    title: 'Avalancha',
    text: 'Pagas primero la deuda con mayor interés. Es la que menos interés total te cuesta.',
    icon: TrendingDown,
  },
  {
    id: 'bola_de_nieve',
    title: 'Bola de nieve',
    text: 'Pagas primero la deuda más pequeña. Liquidas deudas pronto y te mantienes motivado.',
    icon: Snowflake,
  },
  {
    id: 'personalizado',
    title: 'Personalizado',
    text: 'Tú decides el orden según tu situación, porque solo tú conoces el trasfondo de cada deuda.',
    icon: ListOrdered,
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
    <Portal>
      <div className="overlay" role="dialog" aria-modal="true" aria-labelledby="method-title">
        <div className="sheet max-h-[92dvh] max-w-lg overflow-y-auto">
          <div className="space-y-1">
            <h2 id="method-title" className="text-xl font-semibold">
              ¿Cómo quieres atacar tus deudas?
            </h2>
            <p className="text-sm text-muted">Puedes cambiarlo cuando quieras.</p>
          </div>

          <div className="space-y-2.5">
            {options.map((option) => {
              const selected = method === option.id
              const Icon = option.icon
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setMethod(option.id)}
                  aria-pressed={selected}
                  className={`flex w-full items-start gap-3.5 rounded-xl border p-4 text-left transition-[border-color,background-color,box-shadow] duration-200 ease-out ${
                    selected
                      ? 'border-accent bg-accent/5 shadow-[0_0_0_3px_rgb(var(--accent)/0.14)]'
                      : 'border-border hover:border-accent/50 hover:bg-raised'
                  }`}
                >
                  <span
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-colors duration-200 ${
                      selected ? 'bg-accent text-on-accent' : 'bg-raised text-muted'
                    }`}
                  >
                    <Icon size={18} strokeWidth={1.75} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2 font-medium">
                      {option.title}
                      {option.id === 'avalancha' && (
                        <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[11px] font-medium text-accent">
                          recomendado
                        </span>
                      )}
                    </span>
                    <span className="mt-0.5 block text-sm text-muted">{option.text}</span>
                  </span>
                  <span
                    className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-[background-color,border-color,transform] duration-200 ${
                      selected
                        ? 'scale-100 border-accent bg-accent text-on-accent'
                        : 'scale-90 border-border'
                    }`}
                    aria-hidden="true"
                  >
                    {selected && <Check size={12} strokeWidth={3} />}
                  </span>
                </button>
              )
            })}
          </div>

          {method === 'personalizado' && (
            <div className="animate-slide-in space-y-2.5">
              <p className="text-sm text-muted">Arrastra para ordenar: la primera se paga antes.</p>
              <Reorder.Group axis="y" values={order} onReorder={setOrder} className="space-y-2">
                {order.map((debt, index) => (
                  <Reorder.Item
                    key={debt.id}
                    value={debt}
                    className="flex cursor-grab touch-none select-none items-center gap-3 rounded-xl border border-border bg-surface px-3.5 py-3 text-sm shadow-card active:cursor-grabbing"
                  >
                    <span className="num flex h-6 w-6 items-center justify-center rounded-full bg-accent/10 text-xs font-semibold text-accent">
                      {index + 1}
                    </span>
                    <span className="font-medium">{debt.alias}</span>
                    <GripVertical size={16} className="ml-auto text-muted" aria-hidden="true" />
                  </Reorder.Item>
                ))}
              </Reorder.Group>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-1">
            {dismissible && (
              <button type="button" onClick={onClose} className="btn btn-secondary">
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
              className="btn btn-primary"
            >
              Usar este método
            </button>
          </div>
        </div>
      </div>
    </Portal>
  )
}
