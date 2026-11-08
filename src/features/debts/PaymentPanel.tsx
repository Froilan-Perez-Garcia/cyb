import { useState, type FormEvent } from 'react'
import { formatMoney } from '../../lib/format'
import { paymentSchema, useAddPayment, usePayments } from './paymentApi'

const field =
  'w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm outline-none focus:border-accent'

const today = () => new Date().toLocaleDateString('en-CA')

const formatDate = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString('es-MX', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })

export function PaymentPanel({ debtId, balance }: { debtId: string; balance: number }) {
  const [open, setOpen] = useState(false)
  const [error, setError] = useState('')
  const payments = usePayments(debtId, open)
  const add = useAddPayment(debtId)

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = event.currentTarget
    const parsed = paymentSchema.safeParse(Object.fromEntries(new FormData(form)))
    if (!parsed.success) {
      setError(parsed.error.issues[0].message)
      return
    }
    setError('')
    add.mutate(parsed.data, {
      onSuccess: () => form.reset(),
      onError: (e) => setError(e.message),
    })
  }

  return (
    <div className="space-y-3">
      <button
        onClick={() => setOpen(!open)}
        disabled={balance <= 0}
        className="text-sm text-accent disabled:text-muted"
      >
        {balance <= 0 ? 'Deuda saldada' : open ? 'Ocultar abonos' : 'Abonar / historial'}
      </button>

      {open && (
        <div className="space-y-3 border-t border-border pt-3">
          <form onSubmit={submit} className="grid grid-cols-2 gap-2">
            <input
              name="amount"
              type="number"
              step="0.01"
              min="0.01"
              max={balance}
              inputMode="decimal"
              required
              placeholder="Monto"
              className={field}
            />
            <input name="paid_on" type="date" required defaultValue={today()} className={field} />
            <button
              disabled={add.isPending}
              className="col-span-2 rounded-lg bg-accent px-3 py-2 text-sm font-medium text-bg disabled:opacity-60"
            >
              Registrar abono
            </button>
          </form>
          {error && <p className="text-sm text-expense">{error}</p>}

          {payments.isPending ? (
            <p className="text-sm text-muted">Cargando…</p>
          ) : payments.data?.length ? (
            <ul className="space-y-1 text-sm">
              {payments.data.map((payment) => (
                <li key={payment.id} className="flex justify-between">
                  <span className="text-muted">{formatDate(payment.paid_on)}</span>
                  <span className="font-medium text-income">
                    −{formatMoney(Number(payment.amount))}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">Sin abonos todavía.</p>
          )}
        </div>
      )}
    </div>
  )
}
