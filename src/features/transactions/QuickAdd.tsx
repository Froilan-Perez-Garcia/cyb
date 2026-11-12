import { useEffect, useState, type FormEvent } from 'react'
import { LoaderCircle, Plus } from 'lucide-react'
import { Portal } from '../../components/Portal'
import { Segmented } from '../../components/Segmented'
import { useAddTransaction, useCategories } from './api'
import { dayLabel, toIso } from './period'
import { extraReasons, kindLabels, kinds, transactionSchema } from './schema'

const kindOptions = kinds.map((id) => ({ id, label: kindLabels[id] }))

function QuickSheet({ defaultDate, onClose }: { defaultDate: string; onClose: () => void }) {
  const add = useAddTransaction()
  const categories = useCategories()
  const today = toIso(new Date())
  const [kind, setKind] = useState<(typeof kinds)[number]>('gasto')
  const [amount, setAmount] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [concept, setConcept] = useState('')
  const [reason, setReason] = useState<string>('Otro')
  const [date, setDate] = useState(defaultDate || today)
  const [pickingDate, setPickingDate] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const category = categories.data?.find((item) => item.id === categoryId)
    const parsed = transactionSchema.safeParse({
      kind,
      concept: concept.trim() || (kind === 'gasto' && category?.name) || kindLabels[kind],
      amount,
      occurred_on: date,
      category_id: kind === 'gasto' ? categoryId : '',
      reason: kind === 'extra' ? reason : '',
    })
    if (!parsed.success) {
      setError(parsed.error.issues[0].message)
      return
    }
    setError('')
    add.mutate(parsed.data, { onSuccess: onClose, onError: (caught) => setError(caught.message) })
  }

  return (
    <Portal>
      <div
        className="overlay"
        role="dialog"
        aria-modal="true"
        aria-label="Nuevo movimiento"
        onPointerDown={(event) => event.target === event.currentTarget && onClose()}
      >
        <form onSubmit={submit} className="sheet max-w-md space-y-5">
          <Segmented
            name="qkind"
            label="Tipo de movimiento"
            options={kindOptions}
            value={kind}
            onChange={setKind}
          />

          <label className="block">
            <span className="sr-only">Monto</span>
            <span className="flex items-baseline justify-center gap-1 rounded-2xl bg-raised px-4 py-5">
              <span className="text-2xl text-muted">$</span>
              <input
                value={amount}
                onChange={(event) =>
                  setAmount(event.target.value.replace(/[^\d.]/g, '').replace(/(\..*)\./g, '$1'))
                }
                inputMode="decimal"
                autoFocus
                required
                placeholder="0"
                className="num w-full min-w-0 bg-transparent text-center text-5xl font-semibold outline-none placeholder:text-muted/40"
              />
            </span>
          </label>

          {kind === 'gasto' && categories.data && (
            <div className="flex flex-wrap gap-2" role="group" aria-label="Categoría">
              {categories.data.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  aria-pressed={categoryId === category.id}
                  onClick={() => setCategoryId(categoryId === category.id ? '' : category.id)}
                  className="rounded-full border border-border px-3.5 py-1.5 text-sm transition-[background-color,border-color,color,transform] duration-200 active:scale-95 aria-pressed:border-accent aria-pressed:bg-accent/15 aria-pressed:text-accent"
                >
                  {category.name}
                </button>
              ))}
            </div>
          )}

          {kind === 'extra' && (
            <select
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              aria-label="Motivo"
              className="input"
            >
              {extraReasons.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          )}

          <input
            value={concept}
            onChange={(event) => setConcept(event.target.value)}
            maxLength={120}
            placeholder="Nota (opcional)"
            aria-label="Nota"
            className="input"
          />

          <div className="flex items-center justify-between gap-3 text-sm">
            {pickingDate ? (
              <input
                type="date"
                value={date}
                max={today}
                onChange={(event) => setDate(event.target.value)}
                aria-label="Fecha"
                className="input w-auto"
              />
            ) : (
              <span className="text-muted first-letter:uppercase">
                {date === today ? 'Hoy' : dayLabel(date)}
              </span>
            )}
            <button
              type="button"
              onClick={() => setPickingDate(!pickingDate)}
              className="text-accent hover:underline"
            >
              {pickingDate ? 'Listo' : 'Cambiar fecha'}
            </button>
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
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Cancelar
            </button>
            <button disabled={add.isPending} className="btn btn-primary flex-1 py-3">
              {add.isPending && <LoaderCircle size={16} className="animate-spin" />}
              Guardar
            </button>
          </div>
        </form>
      </div>
    </Portal>
  )
}

export function QuickAdd({ defaultDate }: { defaultDate: string }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Portal>
        <button
          onClick={() => setOpen(true)}
          aria-label="Agregar movimiento"
          title="Agregar movimiento"
          className="fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-accent text-on-accent shadow-float transition-transform duration-200 hover:scale-105 active:scale-90 md:bottom-8 md:right-8"
        >
          <Plus size={26} strokeWidth={2} />
        </button>
      </Portal>
      {open && <QuickSheet defaultDate={defaultDate} onClose={() => setOpen(false)} />}
    </>
  )
}
