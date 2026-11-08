import { useState, type FormEvent, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, ChevronDown, LoaderCircle } from 'lucide-react'
import { formatMoney } from '../../lib/format'
import { paymentSchema, useAddPayment, usePayments } from './paymentApi'

const today = () => new Date().toLocaleDateString('en-CA')

const formatDate = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString('es-MX', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })

type Props = { debtId: string; balance: number; trailing?: ReactNode }

export function PaymentPanel({ debtId, balance, trailing }: Props) {
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

  if (balance <= 0) {
    return (
      <div className="flex items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-sm font-medium text-income">
          <Check size={16} strokeWidth={2} />
          Deuda saldada
        </p>
        {trailing}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <button
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          className="btn btn-secondary px-3.5 py-2"
        >
          {open ? 'Ocultar abonos' : 'Abonar / historial'}
          <ChevronDown
            size={16}
            className={`transition-transform duration-300 ease-out ${open ? 'rotate-180' : ''}`}
          />
        </button>
        {trailing}
      </div>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="card-inset space-y-4 p-4">
              <form onSubmit={submit} className="grid grid-cols-2 gap-2.5">
                <label className="relative block">
                  <span className="sr-only">Monto del abono</span>
                  <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-muted">
                    $
                  </span>
                  <input
                    name="amount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={balance}
                    inputMode="decimal"
                    required
                    placeholder="Monto"
                    className="input pl-8"
                  />
                </label>
                <label className="block">
                  <span className="sr-only">Fecha del abono</span>
                  <input
                    name="paid_on"
                    type="date"
                    required
                    defaultValue={today()}
                    className="input"
                  />
                </label>
                <button disabled={add.isPending} className="btn btn-primary col-span-2">
                  {add.isPending && <LoaderCircle size={16} className="animate-spin" />}
                  Registrar abono
                </button>
              </form>

              {error && (
                <p role="alert" className="text-sm text-expense">
                  {error}
                </p>
              )}

              {payments.isPending ? (
                <p className="text-sm text-muted">Cargando…</p>
              ) : payments.data?.length ? (
                <ul className="divide-y divide-border text-sm">
                  {payments.data.map((payment) => (
                    <li key={payment.id} className="flex items-center justify-between py-2">
                      <span className="text-muted first-letter:uppercase">
                        {formatDate(payment.paid_on)}
                      </span>
                      <span className="num font-medium text-income">
                        −{formatMoney(Number(payment.amount))}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted">Sin abonos todavía.</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
