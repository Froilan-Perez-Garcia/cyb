import { useState, type FormEvent } from 'react'
import { LoaderCircle } from 'lucide-react'
import { useAddDebt, useUpdateDebt } from './api'
import { debtSchema, debtTypeLabels, debtTypes, isFormalDebt, type Debt } from './schema'

const numeric = [
  { name: 'total_balance', label: 'Deuda total', adorn: '$', always: true },
  {
    name: 'statement_balance',
    label: 'Saldo a pagar en este estado de cuenta',
    adorn: '$',
    always: false,
  },
  { name: 'minimum_payment', label: 'Pago mínimo', adorn: '$', always: false },
  { name: 'monthly_rate', label: 'Interés mensual', adorn: '%', always: false },
  { name: 'cat', label: 'CAT anual', adorn: '%', always: false, neverRequired: true },
  { name: 'due_day', label: 'Día de pago (1-31)', adorn: '', always: false, neverRequired: true },
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
    <form onSubmit={submit} className="card animate-pop-in space-y-5 p-5 md:p-6">
      <h2 className="text-lg font-semibold">{debt ? 'Editar deuda' : 'Nueva deuda'}</h2>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="field-label">
          <span>Tipo</span>
          <select
            name="type"
            value={type}
            onChange={(event) => setType(event.target.value as Debt['type'])}
            className="input"
          >
            {debtTypes.map((option) => (
              <option key={option} value={option}>
                {debtTypeLabels[option]}
              </option>
            ))}
          </select>
        </label>
        <label className="field-label">
          <span>Nombre</span>
          <input
            name="alias"
            required
            maxLength={60}
            defaultValue={debt?.alias}
            className="input"
          />
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {numeric.map((item) => {
          const required = item.always || (formal && !('neverRequired' in item))
          return (
            <label key={item.name} className="field-label">
              <span>
                {item.label}
                {!required && <span className="field-hint"> (opcional)</span>}
              </span>
              <span className="relative block">
                {item.adorn === '$' && (
                  <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-muted">
                    $
                  </span>
                )}
                <input
                  name={item.name}
                  type="number"
                  step="0.01"
                  min="0"
                  inputMode="decimal"
                  required={required}
                  defaultValue={debt?.[item.name] ?? ''}
                  className={`input ${item.adorn === '$' ? 'pl-8' : ''} ${item.adorn === '%' ? 'pr-9' : ''}`}
                />
                {item.adorn === '%' && (
                  <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-sm text-muted">
                    %
                  </span>
                )}
              </span>
            </label>
          )
        })}
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-xl border border-expense/30 bg-expense/10 px-3.5 py-2.5 text-sm text-expense"
        >
          {error}
        </p>
      )}

      <div className="flex gap-2">
        <button disabled={pending} className="btn btn-primary">
          {pending && <LoaderCircle size={16} className="animate-spin" />}
          {debt ? 'Guardar cambios' : 'Guardar'}
        </button>
        <button type="button" onClick={onDone} className="btn btn-secondary">
          Cancelar
        </button>
      </div>
    </form>
  )
}
