import { useState } from 'react'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { Skeleton } from '../../components/Skeleton'
import { formatMoney } from '../../lib/format'
import { useDebts, useDeleteDebt } from './api'
import { DebtForm } from './DebtForm'
import { PaymentPanel } from './PaymentPanel'
import { debtTypeLabels, type Debt } from './schema'

function DebtDetails({ debt }: { debt: Debt }) {
  const rows: [string, string][] = []
  if (Number(debt.statement_balance) > 0)
    rows.push(['A pagar', formatMoney(Number(debt.statement_balance))])
  if (Number(debt.minimum_payment) > 0)
    rows.push(['Mínimo', formatMoney(Number(debt.minimum_payment))])
  if (Number(debt.monthly_rate) > 0) rows.push(['Interés mensual', `${debt.monthly_rate}%`])
  if (Number(debt.cat) > 0) rows.push(['CAT', `${debt.cat}%`])
  if (debt.due_day) rows.push(['Día de pago', String(debt.due_day)])

  if (rows.length === 0) return null

  return (
    <dl className="grid grid-cols-2 gap-1 text-sm text-muted">
      {rows.map(([label, value]) => (
        <div key={label} className="contents">
          <dt>{label}</dt>
          <dd className="text-right text-text">{value}</dd>
        </div>
      ))}
    </dl>
  )
}

export default function BillsPage() {
  const { data: debts, isPending, error } = useDebts()
  const remove = useDeleteDebt()
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<Debt | null>(null)

  const total = debts?.reduce((sum, debt) => sum + Number(debt.total_balance), 0) ?? 0

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Bills</h1>
          <p className="text-sm text-muted">Deuda total</p>
          <p className="text-3xl font-bold text-expense">{formatMoney(total)}</p>
        </div>
        {!adding && (
          <button
            onClick={() => setAdding(true)}
            className="rounded-lg bg-accent px-4 py-2 font-medium text-bg"
          >
            Agregar deuda
          </button>
        )}
      </div>

      {adding && <DebtForm onDone={() => setAdding(false)} />}

      {deleting && (
        <ConfirmDialog
          title={`¿Eliminar "${deleting.alias}"?`}
          message="Se borrará la deuda junto con todo su historial de abonos. Esta acción no se puede deshacer."
          confirmLabel="Eliminar deuda"
          busy={remove.isPending}
          onCancel={() => setDeleting(null)}
          onConfirm={() => remove.mutate(deleting.id, { onSuccess: () => setDeleting(null) })}
        />
      )}

      {error && <p className="text-expense">{error.message}</p>}

      {isPending || !debts ? (
        <div className="space-y-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : debts.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border p-8 text-center text-muted">
          Aún no registras deudas. Agrega la primera para empezar.
        </p>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {debts.map((debt, index) =>
            editingId === debt.id ? (
              <li key={debt.id} className="md:col-span-2">
                <DebtForm debt={debt} onDone={() => setEditingId(null)} />
              </li>
            ) : (
              <li
                key={debt.id}
                className="animate-slide-in space-y-2 rounded-2xl border border-border bg-surface p-4"
                style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold">{debt.alias}</p>
                    <p className="text-xs text-muted">{debtTypeLabels[debt.type]}</p>
                  </div>
                  <p className="font-bold text-expense">
                    {formatMoney(Number(debt.total_balance))}
                  </p>
                </div>
                <DebtDetails debt={debt} />
                <PaymentPanel debtId={debt.id} balance={Number(debt.total_balance)} />
                <div className="flex gap-4 text-sm">
                  <button
                    onClick={() => setEditingId(debt.id)}
                    className="text-muted hover:text-accent"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => setDeleting(debt)}
                    className="text-muted hover:text-expense"
                  >
                    Eliminar
                  </button>
                </div>
              </li>
            ),
          )}
        </ul>
      )}
    </div>
  )
}
