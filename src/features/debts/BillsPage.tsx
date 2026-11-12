import { useState } from 'react'
import { Pencil, Plus, Trash2, Wallet } from 'lucide-react'
import { AnimatedMoney } from '../../components/AnimatedMoney'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { EmptyState } from '../../components/EmptyState'
import { PageHeader } from '../../components/PageHeader'
import { Skeleton } from '../../components/Skeleton'
import { formatMoney } from '../../lib/format'
import { useDebts, useDeleteDebt } from './api'
import { DebtForm } from './DebtForm'
import { PaymentPanel } from './PaymentPanel'
import { rateTone } from './rate'
import { debtTypeLabels, type Debt } from './schema'

function DebtDetails({ debt }: { debt: Debt }) {
  const rows: [string, string][] = []
  if (Number(debt.statement_balance) > 0)
    rows.push(['A pagar', formatMoney(Number(debt.statement_balance))])
  if (Number(debt.minimum_payment) > 0)
    rows.push(['Mínimo', formatMoney(Number(debt.minimum_payment))])
  if (Number(debt.cat) > 0) rows.push(['CAT', `${debt.cat}%`])
  if (debt.due_day) rows.push(['Día de pago', String(debt.due_day)])

  if (rows.length === 0) return null

  return (
    <dl className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
      {rows.map(([label, value]) => (
        <div key={label}>
          <dt className="text-xs text-muted">{label}</dt>
          <dd className="num text-sm font-medium">{value}</dd>
        </div>
      ))}
    </dl>
  )
}

function Composition({ debts, total }: { debts: Debt[]; total: number }) {
  const active = debts.filter((debt) => Number(debt.total_balance) > 0)
  if (active.length === 0) return null

  return (
    <div className="space-y-3">
      <div
        className="flex h-2.5 gap-1 overflow-hidden rounded-full"
        role="img"
        aria-label="Composición de tu deuda total por deuda"
      >
        {active.map((debt, index) => (
          <span
            key={debt.id}
            className={`basis-0 origin-left animate-grow rounded-full ${rateTone(Number(debt.monthly_rate)).bar}`}
            style={{ flexGrow: Number(debt.total_balance), animationDelay: `${index * 90}ms` }}
          />
        ))}
      </div>
      <ul className="flex flex-wrap gap-x-5 gap-y-1.5">
        {active.map((debt) => (
          <li key={debt.id} className="flex items-center gap-2 text-xs text-muted">
            <span className={`h-2 w-2 rounded-full ${rateTone(Number(debt.monthly_rate)).bar}`} />
            <span>{debt.alias}</span>
            <span className="num font-medium text-text">
              {Math.round((Number(debt.total_balance) / total) * 100)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
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
      <PageHeader
        title="Tus deudas"
        actions={
          !adding && (
            <button onClick={() => setAdding(true)} className="btn btn-primary">
              <Plus size={16} strokeWidth={2} />
              Agregar deuda
            </button>
          )
        }
      />

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

      {error && (
        <p role="alert" className="text-sm text-expense">
          {error.message}
        </p>
      )}

      {isPending || !debts ? (
        <div className="space-y-4">
          <Skeleton className="h-40" />
          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,20rem),1fr))] gap-4">
            <Skeleton className="h-44" />
            <Skeleton className="h-44" />
          </div>
        </div>
      ) : debts.length === 0 ? (
        !adding && (
          <EmptyState
            icon={Wallet}
            title="Aún no registras deudas"
            text="Agrega la primera para empezar a ver tu plan de pago."
            action={
              <button onClick={() => setAdding(true)} className="btn btn-primary">
                <Plus size={16} strokeWidth={2} />
                Agregar deuda
              </button>
            }
          />
        )
      ) : (
        <>
          <section className="card animate-slide-in space-y-5 p-5 md:p-6">
            <div>
              <p className="text-sm text-muted">Deuda total</p>
              <AnimatedMoney value={total} className="block text-4xl font-semibold md:text-5xl" />
            </div>
            <Composition debts={debts} total={total} />
          </section>

          <ul className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,20rem),1fr))] items-start gap-4">
            {debts.map((debt, index) =>
              editingId === debt.id ? (
                <li key={debt.id} className="col-span-full">
                  <DebtForm debt={debt} onDone={() => setEditingId(null)} />
                </li>
              ) : (
                <li
                  key={debt.id}
                  className="card animate-slide-in space-y-4 p-5"
                  style={{ animationDelay: `${60 + Math.min(index, 8) * 60}ms` }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1.5">
                      <h2 className="truncate text-base font-semibold">{debt.alias}</h2>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="rounded-full bg-raised px-2.5 py-0.5 text-xs font-medium text-muted">
                          {debtTypeLabels[debt.type]}
                        </span>
                        {Number(debt.monthly_rate) > 0 && (
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${rateTone(Number(debt.monthly_rate)).soft}`}
                          >
                            {debt.monthly_rate}% mensual
                          </span>
                        )}
                      </div>
                    </div>
                    <AnimatedMoney
                      value={Number(debt.total_balance)}
                      className="shrink-0 text-xl font-semibold"
                    />
                  </div>

                  <DebtDetails debt={debt} />

                  <div className="border-t border-border pt-4">
                    <PaymentPanel
                      debtId={debt.id}
                      balance={Number(debt.total_balance)}
                      trailing={
                        <div className="flex shrink-0 items-center">
                          <button
                            onClick={() => setEditingId(debt.id)}
                            aria-label={`Editar ${debt.alias}`}
                            className="btn-icon hover:text-accent"
                          >
                            <Pencil size={16} strokeWidth={1.75} />
                          </button>
                          <button
                            onClick={() => setDeleting(debt)}
                            aria-label={`Eliminar ${debt.alias}`}
                            className="btn-icon hover:text-expense"
                          >
                            <Trash2 size={16} strokeWidth={1.75} />
                          </button>
                        </div>
                      }
                    />
                  </div>
                </li>
              ),
            )}
          </ul>
        </>
      )}
    </div>
  )
}
