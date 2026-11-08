import { useState, type FormEvent } from 'react'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { formatMoney } from '../../lib/format'
import { useCategories } from './api'
import { parseIso, toIso } from './period'
import {
  frequencies,
  frequencyLabels,
  recurringSchema,
  useAddRecurring,
  useDeleteRecurring,
  useRecurring,
  useUpdateRecurring,
  type RecurringItem,
} from './recurringApi'

const field =
  'w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm outline-none focus:border-accent'

const nextLabel = (iso: string) =>
  parseIso(iso).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })

function RecurringForm({ item, onDone }: { item?: RecurringItem; onDone?: () => void }) {
  const categories = useCategories()
  const add = useAddRecurring()
  const update = useUpdateRecurring()
  const [kind, setKind] = useState<'ingreso' | 'gasto'>(item?.kind ?? 'gasto')
  const [error, setError] = useState('')
  const pending = add.isPending || update.isPending

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = event.currentTarget
    const parsed = recurringSchema.safeParse({ ...Object.fromEntries(new FormData(form)), kind })
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
    if (item) update.mutate({ id: item.id, input: parsed.data }, callbacks)
    else add.mutate(parsed.data, callbacks)
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="grid grid-cols-2 gap-1 rounded-lg bg-bg p-1">
        {(['gasto', 'ingreso'] as const).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setKind(option)}
            className={`rounded-md px-2 py-1.5 text-sm font-medium transition-colors ${
              kind === option ? 'bg-accent text-bg' : 'text-muted hover:text-text'
            }`}
          >
            {option === 'gasto' ? 'Gasto' : 'Ingreso'}
          </button>
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <input
          name="concept"
          aria-label="Concepto"
          required
          maxLength={120}
          placeholder="Concepto (Renta)"
          defaultValue={item?.concept}
          className={`${field} sm:col-span-2`}
        />
        <input
          name="amount"
          aria-label="Monto"
          type="number"
          step="0.01"
          min="0.01"
          inputMode="decimal"
          required
          placeholder="Monto"
          defaultValue={item?.amount}
          className={field}
        />
        <select
          name="frequency"
          aria-label="Frecuencia"
          defaultValue={item?.frequency ?? 'mensual'}
          className={field}
        >
          {frequencies.map((frequency) => (
            <option key={frequency} value={frequency}>
              {frequencyLabels[frequency]}
            </option>
          ))}
        </select>
        <label className="space-y-1 text-xs text-muted">
          <span>{item ? 'Próxima fecha' : 'Primera fecha'}</span>
          <input
            name="next_on"
            type="date"
            required
            min={item ? toIso(new Date()) : undefined}
            defaultValue={item?.next_on ?? toIso(new Date())}
            className={field}
          />
        </label>
        {kind === 'gasto' && (
          <label className="space-y-1 text-xs text-muted">
            <span>Categoría (opcional)</span>
            <select name="category_id" defaultValue={item?.category_id ?? ''} className={field}>
              <option value="">Sin categoría</option>
              {categories.data?.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
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
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-bg disabled:opacity-60"
        >
          {item ? 'Guardar cambios' : 'Agregar recurrente'}
        </button>
        {item && (
          <button
            type="button"
            onClick={onDone}
            className="rounded-lg border border-border px-4 py-2 text-sm text-muted hover:text-text"
          >
            Cancelar
          </button>
        )}
      </div>
    </form>
  )
}

export function RecurringManager() {
  const items = useRecurring()
  const remove = useDeleteRecurring()
  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<RecurringItem | null>(null)

  return (
    <div className="space-y-3">
      <button onClick={() => setOpen(!open)} className="text-sm text-accent">
        {open ? 'Ocultar recurrentes' : 'Recurrentes (renta, sueldo, servicios…)'}
      </button>
      {deleting && (
        <ConfirmDialog
          title={`¿Eliminar "${deleting.concept}"?`}
          message="Dejará de generar movimientos nuevos. Los movimientos que ya creó se conservan. Esta acción no se puede deshacer."
          confirmLabel="Eliminar recurrente"
          busy={remove.isPending}
          onCancel={() => setDeleting(null)}
          onConfirm={() => remove.mutate(deleting.id, { onSuccess: () => setDeleting(null) })}
        />
      )}
      {open && (
        <div className="space-y-4 rounded-2xl border border-border bg-surface p-4">
          {items.data?.length ? (
            <ul className="divide-y divide-border">
              {items.data.map((item) =>
                editingId === item.id ? (
                  <li key={item.id} className="py-3">
                    <RecurringForm item={item} onDone={() => setEditingId(null)} />
                  </li>
                ) : (
                  <li
                    key={item.id}
                    className="flex items-center justify-between gap-3 py-2 text-sm"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">{item.concept}</p>
                      <p className="text-xs text-muted">
                        {frequencyLabels[item.frequency]} · próximo {nextLabel(item.next_on)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span
                        className={`font-semibold ${
                          item.kind === 'gasto' ? 'text-expense' : 'text-income'
                        }`}
                      >
                        {formatMoney(Number(item.amount))}
                      </span>
                      <button
                        onClick={() => setEditingId(item.id)}
                        aria-label={`Editar ${item.concept}`}
                        className="text-muted hover:text-accent"
                      >
                        ✎
                      </button>
                      <button
                        onClick={() => setDeleting(item)}
                        aria-label={`Eliminar ${item.concept}`}
                        className="text-muted hover:text-expense"
                      >
                        ✕
                      </button>
                    </div>
                  </li>
                ),
              )}
            </ul>
          ) : (
            <p className="text-sm text-muted">Aún no tienes movimientos recurrentes.</p>
          )}
          <div className="border-t border-border pt-4">
            <RecurringForm />
          </div>
        </div>
      )}
    </div>
  )
}
