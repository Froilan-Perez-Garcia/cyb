import { useState, type FormEvent } from 'react'
import { useAddDebt, useUpdateDebt } from './api'
import { debtSchema, debtTypeLabels, debtTypes, isFormalDebt, type Debt } from './schema'

const field =
  'w-full rounded-lg border border-border bg-bg px-3 py-2 outline-none focus:border-accent'

const numeric = [
  { name: 'total_balance', label: 'Deuda total', always: true },
  { name: 'statement_balance', label: 'Saldo a pagar en este estado de cuenta', always: false },
  { name: 'minimum_payment', label: 'Pago mínimo', always: false },
  { name: 'monthly_rate', label: 'Interés mensual (%)', always: false },
  { name: 'cat', label: 'CAT anual (%)', always: false, neverRequired: true },
  { name: 'due_day', label: 'Día de pago (1-31)', always: false, neverRequired: true },
] as const

export function DebtForm({ debt, onDone }: { debt?: Debt; onDone: () => void }) {
  const add = useAddDebt()
  const update = useUpdateDebt()
  const [type, setType] = useState<Debt['type']>(debt?.type ?? 'tarjeta')
  const [error, setError] = useState('')
  const formal = isFormalDebt(type)
  const pending = add.isPending || update.isPending

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const values = Object.fromEntries(new FormData(event.currentTarget))
    const parsed = debtSchema.safeParse(values)
    if (!parsed.success) {
      setError(parsed.error.issues[0].message)
      return
    }
    const callbacks = { onSuccess: onDone, onError: (e: Error) => setError(e.message) }
    if (debt) update.mutate({ id: debt.id, input: parsed.data }, callbacks)
    else add.mutate(parsed.data, callbacks)
  }

  return (
    <form onSubmit={submit} className="space-y-3 rounded-2xl border border-border bg-surface p-4">
      <label className="block space-y-1 text-sm">
        <span>Tipo</span>
        <select
          name="type"
          value={type}
          onChange={(e) => setType(e.target.value as Debt['type'])}
          className={field}
        >
          {debtTypes.map((option) => (
            <option key={option} value={option}>
              {debtTypeLabels[option]}
            </option>
          ))}
        </select>
      </label>
      <label className="block space-y-1 text-sm">
        <span>Nombre</span>
        <input name="alias" required maxLength={60} defaultValue={debt?.alias} className={field} />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        {numeric.map((item) => {
          const required = item.always || (formal && !('neverRequired' in item))
          return (
            <label key={item.name} className="block space-y-1 text-sm">
              <span>
                {item.label}
                {!required && <span className="text-muted"> (opcional)</span>}
              </span>
              <input
                name={item.name}
                type="number"
                step="0.01"
                min="0"
                inputMode="decimal"
                required={required}
                defaultValue={debt?.[item.name] ?? ''}
                className={field}
              />
            </label>
          )
        })}
      </div>
      {error && <p className="text-sm text-expense">{error}</p>}
      <div className="flex gap-2">
        <button
          disabled={pending}
          className="rounded-lg bg-accent px-4 py-2 font-medium text-bg disabled:opacity-60"
        >
          {debt ? 'Guardar cambios' : 'Guardar'}
        </button>
        <button
          type="button"
          onClick={onDone}
          className="rounded-lg border border-border px-4 py-2 text-muted hover:text-text"
        >
          Cancelar
        </button>
      </div>
    </form>
  )
}
