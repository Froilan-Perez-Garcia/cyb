import { useState } from 'react'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { Skeleton } from '../../components/Skeleton'
import { formatMoney } from '../../lib/format'
import { useDeleteTransaction, useTransactions } from './api'
import { CategoryManager } from './CategoryManager'
import { dayLabel, getRange, periodLabel, shift, toIso, type View } from './period'
import { RecurringManager } from './RecurringManager'
import { kindLabels, summarize, type Transaction } from './schema'
import { TransactionForm } from './TransactionForm'

const views: { id: View; label: string }[] = [
  { id: 'dia', label: 'Día' },
  { id: 'quincena', label: 'Quincena' },
  { id: 'mes', label: 'Mes' },
]

const sign = { gasto: '−', ingreso: '+', extra: '+' } as const

function groupByDay(transactions: Transaction[]) {
  const groups = new Map<string, Transaction[]>()
  for (const transaction of transactions) {
    const list = groups.get(transaction.occurred_on) ?? []
    list.push(transaction)
    groups.set(transaction.occurred_on, list)
  }
  return [...groups.entries()]
}

export default function MovimientosPage() {
  const [view, setView] = useState<View>('quincena')
  const [anchor, setAnchor] = useState(() => new Date())
  const { from, to } = getRange(view, anchor)
  const { data: transactions, isPending, error } = useTransactions(from, to)
  const remove = useDeleteTransaction()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<Transaction | null>(null)

  const summary = transactions ? summarize(transactions) : null
  const today = toIso(new Date())
  const defaultDate = today >= from && today <= to ? today : from

  const cards = summary
    ? [
        { label: 'Ingresos', value: summary.ingreso, tone: 'text-income' },
        { label: 'Extras', value: summary.extra, tone: 'text-income' },
        { label: 'Gastos', value: summary.gasto, tone: 'text-expense' },
        {
          label: 'Balance',
          value: summary.balance,
          tone: summary.balance >= 0 ? 'text-income' : 'text-expense',
        },
      ]
    : []

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Movimientos</h1>
        <div className="flex gap-1 rounded-lg bg-surface p-1">
          {views.map((option) => (
            <button
              key={option.id}
              onClick={() => setView(option.id)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                view === option.id ? 'bg-accent text-bg' : 'text-muted hover:text-text'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between rounded-2xl border border-border bg-surface px-4 py-3">
        <button
          onClick={() => setAnchor(shift(view, anchor, -1))}
          aria-label="Periodo anterior"
          className="px-2 text-xl text-muted hover:text-text"
        >
          ‹
        </button>
        <span className="block font-medium first-letter:uppercase">
          {periodLabel(view, anchor)}
        </span>
        <button
          onClick={() => setAnchor(shift(view, anchor, 1))}
          aria-label="Periodo siguiente"
          className="px-2 text-xl text-muted hover:text-text"
        >
          ›
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {isPending || !summary
          ? Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="h-20" />)
          : cards.map((card) => (
              <div key={card.label} className="rounded-2xl border border-border bg-surface p-4">
                <p className="text-sm text-muted">{card.label}</p>
                <p className={`text-xl font-bold ${card.tone}`}>{formatMoney(card.value)}</p>
              </div>
            ))}
      </div>

      <TransactionForm defaultDate={defaultDate} />

      {deleting && (
        <ConfirmDialog
          title={`¿Eliminar "${deleting.concept}"?`}
          message={`Se borrará este movimiento de ${formatMoney(Number(deleting.amount))}. Esta acción no se puede deshacer.`}
          confirmLabel="Eliminar movimiento"
          busy={remove.isPending}
          onCancel={() => setDeleting(null)}
          onConfirm={() => remove.mutate(deleting.id, { onSuccess: () => setDeleting(null) })}
        />
      )}

      {error && <p className="text-expense">{error.message}</p>}

      {isPending || !transactions ? (
        <div className="space-y-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : transactions.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border p-8 text-center text-muted">
          Sin movimientos en este periodo.
        </p>
      ) : (
        <div className="space-y-5">
          {groupByDay(transactions).map(([day, items]) => (
            <section key={day} className="space-y-2">
              <h2 className="text-sm font-semibold text-muted first-letter:uppercase">
                {dayLabel(day)}
              </h2>
              <ul className="divide-y divide-border rounded-2xl border border-border bg-surface">
                {items.map((item, index) =>
                  editingId === item.id ? (
                    <li key={item.id} className="p-3">
                      <TransactionForm
                        defaultDate={item.occurred_on}
                        transaction={item}
                        onDone={() => setEditingId(null)}
                      />
                    </li>
                  ) : (
                    <li
                      key={item.id}
                      className="flex animate-slide-in items-center justify-between gap-3 p-3"
                      style={{ animationDelay: `${Math.min(index, 8) * 30}ms` }}
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium">{item.concept}</p>
                        <p className="truncate text-xs text-muted">
                          {kindLabels[item.kind]}
                          {item.categories && ` · ${item.categories.name}`}
                          {item.reason && ` · ${item.reason}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span
                          className={`font-semibold ${
                            item.kind === 'gasto' ? 'text-expense' : 'text-income'
                          }`}
                        >
                          {sign[item.kind]}
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
            </section>
          ))}
        </div>
      )}

      <RecurringManager />
      <CategoryManager />
    </div>
  )
}
