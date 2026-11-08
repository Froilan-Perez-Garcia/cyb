import { useState, type FormEvent } from 'react'
import { toIso } from './period'
import { useAddTransaction, useCategories, useUpdateTransaction } from './api'
import { extraReasons, kindLabels, kinds, transactionSchema, type Transaction } from './schema'

const field =
  'w-full rounded-lg border border-border bg-bg px-3 py-2 outline-none focus:border-accent'

type Props = { defaultDate: string; transaction?: Transaction; onDone?: () => void }

export function TransactionForm({ defaultDate, transaction, onDone }: Props) {
  const add = useAddTransaction()
  const update = useUpdateTransaction()
  const categories = useCategories()
  const [kind, setKind] = useState<(typeof kinds)[number]>(transaction?.kind ?? 'gasto')
  const [error, setError] = useState('')
  const pending = add.isPending || update.isPending

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = event.currentTarget
    const parsed = transactionSchema.safeParse({
      ...Object.fromEntries(new FormData(form)),
      kind,
    })
    if (!parsed.success) {
      setError(parsed.error.issues[0].message)
      return
    }
    setError('')
    const callbacks = {
      onSuccess: () => {
        form.reset()
        onDone?.()
      },
      onError: (e: Error) => setError(e.message),
    }
    if (transaction) update.mutate({ id: transaction.id, input: parsed.data }, callbacks)
    else add.mutate(parsed.data, callbacks)
  }

  return (
    <form onSubmit={submit} className="space-y-3 rounded-2xl border border-border bg-surface p-4">
      <div className="grid grid-cols-3 gap-1 rounded-lg bg-bg p-1">
        {kinds.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setKind(option)}
            className={`rounded-md px-2 py-1.5 text-sm font-medium transition-colors ${
              kind === option ? 'bg-accent text-bg' : 'text-muted hover:text-text'
            }`}
          >
            {kindLabels[option]}
          </button>
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block space-y-1 text-sm sm:col-span-2">
          <span>Concepto</span>
          <input
            name="concept"
            required
            maxLength={120}
            placeholder="Papas"
            defaultValue={transaction?.concept}
            className={field}
          />
        </label>
        <label className="block space-y-1 text-sm">
          <span>Monto</span>
          <input
            name="amount"
            type="number"
            step="0.01"
            min="0.01"
            inputMode="decimal"
            required
            defaultValue={transaction?.amount}
            className={field}
          />
        </label>
        <label className="block space-y-1 text-sm">
          <span>Fecha</span>
          <input
            key={defaultDate}
            name="occurred_on"
            type="date"
            required
            defaultValue={transaction?.occurred_on ?? (defaultDate || toIso(new Date()))}
            className={field}
          />
        </label>
        {kind === 'gasto' && (
          <label className="block space-y-1 text-sm sm:col-span-2">
            <span>
              Categoría <span className="text-muted">(opcional)</span>
            </span>
            <select
              name="category_id"
              className={field}
              defaultValue={transaction?.category_id ?? ''}
            >
              <option value="">Sin categoría</option>
              {categories.data?.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                  {category.essential ? ' · esencial' : ''}
                </option>
              ))}
            </select>
          </label>
        )}
        {kind === 'extra' && (
          <label className="block space-y-1 text-sm sm:col-span-2">
            <span>Motivo</span>
            <select name="reason" className={field} defaultValue={transaction?.reason ?? 'Bono'}>
              {extraReasons.map((reason) => (
                <option key={reason} value={reason}>
                  {reason}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
      {error && <p className="text-sm text-expense">{error}</p>}
      <div className="flex gap-2">
        <button
          disabled={pending}
          className="rounded-lg bg-accent px-4 py-2 font-medium text-bg disabled:opacity-60"
        >
          {transaction ? 'Guardar cambios' : `Guardar ${kindLabels[kind].toLowerCase()}`}
        </button>
        {transaction && (
          <button
            type="button"
            onClick={onDone}
            className="rounded-lg border border-border px-4 py-2 text-muted hover:text-text"
          >
            Cancelar
          </button>
        )}
      </div>
    </form>
  )
}
