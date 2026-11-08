import { useState, type FormEvent } from 'react'
import { LoaderCircle, Pencil, Repeat, Trash2 } from 'lucide-react'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { Disclosure } from '../../components/Disclosure'
import { Segmented } from '../../components/Segmented'
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

const nextLabel = (iso: string) =>
  parseIso(iso).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })

const recurringKinds = [
  { id: 'gasto', label: 'Gasto' },
  { id: 'ingreso', label: 'Ingreso' },
] as const

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
    <form onSubmit={submit} className="space-y-4">
      <Segmented
        name={item ? `rkind-${item.id}` : 'rkind'}
        label="Tipo de recurrente"
        options={[...recurringKinds]}
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
            placeholder="Renta"
            defaultValue={item?.concept}
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
              defaultValue={item?.amount}
              className="input pl-8"
            />
          </span>
        </label>
        <label className="field-label">
          <span>Frecuencia</span>
          <select name="frequency" defaultValue={item?.frequency ?? 'mensual'} className="input">
            {frequencies.map((frequency) => (
              <option key={frequency} value={frequency}>
                {frequencyLabels[frequency]}
              </option>
            ))}
          </select>
        </label>
        <label className="field-label">
          <span>{item ? 'Próxima fecha' : 'Primera fecha'}</span>
          <input
            name="next_on"
            type="date"
            required
            min={item ? toIso(new Date()) : undefined}
            defaultValue={item?.next_on ?? toIso(new Date())}
            className="input"
          />
        </label>
        {kind === 'gasto' && (
          <label className="field-label">
            <span>
              Categoría <span className="field-hint">(opcional)</span>
            </span>
            <select name="category_id" defaultValue={item?.category_id ?? ''} className="input">
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
          {item ? 'Guardar cambios' : 'Agregar recurrente'}
        </button>
        {item && (
          <button type="button" onClick={onDone} className="btn btn-secondary">
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
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<RecurringItem | null>(null)

  return (
    <>
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
      <Disclosure
        title="Recurrentes"
        description="Renta, sueldo, servicios: se registran solos en su fecha."
        icon={Repeat}
      >
        <div className="space-y-6">
          {items.data?.length ? (
            <ul className="divide-y divide-border">
              {items.data.map((item) =>
                editingId === item.id ? (
                  <li key={item.id} className="py-4">
                    <RecurringForm item={item} onDone={() => setEditingId(null)} />
                  </li>
                ) : (
                  <li key={item.id} className="flex items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{item.concept}</p>
                      <p className="text-xs text-muted">
                        {frequencyLabels[item.frequency]} · próximo {nextLabel(item.next_on)}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <span
                        className={`num mr-2 text-sm font-semibold ${
                          item.kind === 'gasto' ? 'text-expense' : 'text-income'
                        }`}
                      >
                        {formatMoney(Number(item.amount))}
                      </span>
                      <button
                        onClick={() => setEditingId(item.id)}
                        aria-label={`Editar ${item.concept}`}
                        className="btn-icon hover:text-accent"
                      >
                        <Pencil size={16} strokeWidth={1.75} />
                      </button>
                      <button
                        onClick={() => setDeleting(item)}
                        aria-label={`Eliminar ${item.concept}`}
                        className="btn-icon hover:text-expense"
                      >
                        <Trash2 size={16} strokeWidth={1.75} />
                      </button>
                    </div>
                  </li>
                ),
              )}
            </ul>
          ) : (
            <p className="text-sm text-muted">Aún no tienes movimientos recurrentes.</p>
          )}
          <div className="space-y-4 border-t border-border pt-6">
            <h3 className="text-sm font-semibold">Nuevo recurrente</h3>
            <RecurringForm />
          </div>
        </div>
      </Disclosure>
    </>
  )
}
