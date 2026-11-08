import { useState, type FormEvent } from 'react'
import { LoaderCircle } from 'lucide-react'
import { Segmented } from '../../components/Segmented'
import { toIso } from './period'
import { useAddTransaction, useCategories, useUpdateTransaction } from './api'
import { extraReasons, kindLabels, kinds, transactionSchema, type Transaction } from './schema'

type Props = { defaultDate: string; transaction?: Transaction; onDone?: () => void }

const kindOptions = kinds.map((id) => ({ id, label: kindLabels[id] }))

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
    <form
      onSubmit={submit}
      className={transaction ? 'space-y-5 p-4 md:p-5' : 'card space-y-5 p-5 md:p-6'}
    >
      {!transaction && <h2 className="text-lg font-semibold">Nuevo movimiento</h2>}

      <Segmented
        name={transaction ? `kind-${transaction.id}` : 'kind'}
        label="Tipo de movimiento"
        options={kindOptions}
        value={kind}
        onChange={setKind}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="field-label sm:col-span-2">
          <span>Concepto</span>
          <input
            name="concept"
            required
            maxLength={120}
            placeholder="Papas"
            defaultValue={transaction?.concept}
            className="input"
          />
        </label>
        <label className="field-label">
          <span>Monto</span>
          <span className="relative block">
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-muted">
              $
            </span>
            <input
              name="amount"
              type="number"
              step="0.01"
              min="0.01"
              inputMode="decimal"
              required
              defaultValue={transaction?.amount}
              className="input pl-8"
            />
          </span>
        </label>
        <label className="field-label">
          <span>Fecha</span>
          <input
            key={defaultDate}
            name="occurred_on"
            type="date"
            required
            defaultValue={transaction?.occurred_on ?? (defaultDate || toIso(new Date()))}
            className="input"
          />
        </label>
        {kind === 'gasto' && (
          <label className="field-label sm:col-span-2">
            <span>
              Categoría <span className="field-hint">(opcional)</span>
            </span>
            <select
              name="category_id"
              className="input"
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
          <label className="field-label sm:col-span-2">
            <span>Motivo</span>
            <select name="reason" className="input" defaultValue={transaction?.reason ?? 'Bono'}>
              {extraReasons.map((reason) => (
                <option key={reason} value={reason}>
                  {reason}
                </option>
              ))}
            </select>
          </label>
        )}
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
          {transaction ? 'Guardar cambios' : `Guardar ${kindLabels[kind].toLowerCase()}`}
        </button>
        {transaction && (
          <button type="button" onClick={onDone} className="btn btn-secondary">
            Cancelar
          </button>
        )}
      </div>
    </form>
  )
}
