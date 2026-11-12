import { useState } from 'react'
import {
  ArrowDownLeft,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Pencil,
  Receipt,
  Sparkles,
  Trash2,
  type LucideIcon,
} from 'lucide-react'
import { AnimatedMoney } from '../../components/AnimatedMoney'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { EmptyState } from '../../components/EmptyState'
import { PageHeader } from '../../components/PageHeader'
import { Segmented } from '../../components/Segmented'
import { Skeleton } from '../../components/Skeleton'
import { formatMoney } from '../../lib/format'
import { setDebtsModule } from '../../lib/modules'
import { useDebtsVisible } from '../debts/useDebtsVisible'
import { useDeleteTransaction, useTransactions } from './api'
import { CategoryManager } from './CategoryManager'
import { dayLabel, getRange, parseIso, periodLabel, shift, toIso, type View } from './period'
import { QuickAdd } from './QuickAdd'
import { RecurringManager } from './RecurringManager'
import { useRecurring } from './recurringApi'
import { kindLabels, summarize, type Transaction } from './schema'
import { SetupPrompt, SetupWizard } from './SetupWizard'
import { TransactionForm } from './TransactionForm'

const views: { id: View; label: string }[] = [
  { id: 'dia', label: 'Día' },
  { id: 'quincena', label: 'Quincena' },
  { id: 'mes', label: 'Mes' },
]

const sign = { gasto: '−', ingreso: '+', extra: '+' } as const

const kindIcon: Record<Transaction['kind'], LucideIcon> = {
  gasto: ArrowUpRight,
  ingreso: ArrowDownLeft,
  extra: Sparkles,
}

const kindTone: Record<Transaction['kind'], string> = {
  gasto: 'bg-expense/10 text-expense',
  ingreso: 'bg-income/10 text-income',
  extra: 'bg-accent/10 text-accent',
}

function groupByDay(transactions: Transaction[]) {
  const groups = new Map<string, Transaction[]>()
  for (const transaction of transactions) {
    const list = groups.get(transaction.occurred_on) ?? []
    list.push(transaction)
    groups.set(transaction.occurred_on, list)
  }
  return [...groups.entries()]
}

function dayNet(items: Transaction[]) {
  return items.reduce(
    (sum, item) => sum + (item.kind === 'gasto' ? -1 : 1) * Number(item.amount),
    0,
  )
}

function SpendBar({ spent, earned }: { spent: number; earned: number }) {
  if (earned <= 0) return null
  const ratio = spent / earned
  const tone = ratio >= 1 ? 'bg-expense' : ratio >= 0.8 ? 'bg-warn' : 'bg-accent'
  const percent = Math.round(ratio * 100)

  return (
    <div className="space-y-2">
      <div
        className="h-2 overflow-hidden rounded-full bg-raised"
        role="img"
        aria-label={`Gastaste ${percent}% de lo que entró en este periodo`}
      >
        <div
          className={`h-full origin-left animate-grow rounded-full ${tone}`}
          style={{ width: `${Math.min(ratio, 1) * 100}%` }}
        />
      </div>
      <p className="text-xs text-muted">
        Gastaste <span className="num font-medium text-text">{percent}%</span> de lo que entró
      </p>
    </div>
  )
}

function Breakdown({ transactions }: { transactions: Transaction[] }) {
  const totals = new Map<string, number>()
  for (const item of transactions) {
    if (item.kind !== 'gasto') continue
    const name = item.categories?.name ?? 'Sin categoría'
    totals.set(name, (totals.get(name) ?? 0) + Number(item.amount))
  }
  const rows = [...totals.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5)
  if (rows.length === 0) return null
  const max = rows[0][1]

  return (
    <section className="card animate-slide-in space-y-4 p-5 md:p-6">
      <h2 className="font-semibold">En qué se va</h2>
      <ul className="space-y-3">
        {rows.map(([name, total]) => (
          <li key={name} className="space-y-1.5">
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="truncate">{name}</span>
              <span className="num shrink-0 font-medium">{formatMoney(total)}</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-raised">
              <div
                className="h-full origin-left animate-grow rounded-full bg-accent/70"
                style={{ width: `${(total / max) * 100}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}

function DebtsInvite() {
  const { visible } = useDebtsVisible()
  if (visible) return null

  return (
    <section className="flex flex-wrap items-center gap-3 rounded-2xl border border-dashed border-border p-4">
      <CreditCard size={18} strokeWidth={1.75} className="shrink-0 text-muted" />
      <p className="min-w-0 flex-1 basis-48 text-sm text-muted">
        ¿Tienes tarjetas o deudas? Activa su control y verás un plan para pagarlas.
      </p>
      <button onClick={() => setDebtsModule(true)} className="btn btn-secondary">
        Activar deudas
      </button>
    </section>
  )
}

export default function FlujoPage() {
  const [view, setView] = useState<View>('mes')
  const [anchor, setAnchor] = useState(() => new Date())
  const { from, to } = getRange(view, anchor)
  const { data: transactions, isPending, error } = useTransactions(from, to)
  const remove = useDeleteTransaction()
  const recurring = useRecurring()
  const [settingUp, setSettingUp] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<Transaction | null>(null)

  const summary = transactions ? summarize(transactions) : null
  const today = toIso(new Date())
  const includesToday = today >= from && today <= to
  const defaultDate = includesToday ? today : from
  const daysLeft = Math.round((parseIso(to).getTime() - parseIso(today).getTime()) / 86400000) + 1

  return (
    <div className="space-y-6">
      <PageHeader
        title="Flujo"
        actions={
          <Segmented
            name="view"
            label="Periodo"
            options={views}
            value={view}
            onChange={setView}
            className="w-full sm:w-64"
          />
        }
      />

      <div className="card flex items-center justify-between p-1.5">
        <button
          onClick={() => setAnchor(shift(view, anchor, -1))}
          aria-label="Periodo anterior"
          className="btn-icon h-10 w-10"
        >
          <ChevronLeft size={20} strokeWidth={1.75} />
        </button>
        <span className="font-medium first-letter:uppercase">{periodLabel(view, anchor)}</span>
        <button
          onClick={() => setAnchor(shift(view, anchor, 1))}
          aria-label="Periodo siguiente"
          className="btn-icon h-10 w-10"
        >
          <ChevronRight size={20} strokeWidth={1.75} />
        </button>
      </div>

      {recurring.data?.length === 0 && <SetupPrompt onStart={() => setSettingUp(true)} />}
      {settingUp && <SetupWizard onClose={() => setSettingUp(false)} />}

      {isPending || !summary ? (
        <Skeleton className="h-44" />
      ) : (
        <section className="card animate-slide-in space-y-5 p-5 md:p-6">
          <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-5">
            <div>
              <p className="text-sm text-muted">{includesToday ? 'Te queda' : 'Balance'}</p>
              <AnimatedMoney
                value={summary.balance}
                className={`block text-4xl font-semibold ${summary.balance >= 0 ? 'text-income' : 'text-expense'}`}
              />
              {includesToday && (
                <p className="mt-1 text-sm text-muted">
                  {summary.balance > 0
                    ? `≈ ${formatMoney(summary.balance / daysLeft)} al día durante ${daysLeft} ${daysLeft === 1 ? 'día' : 'días'}`
                    : summary.balance < 0
                      ? 'Estás gastando más de lo que entró'
                      : 'Sin margen por ahora'}
                </p>
              )}
            </div>
            <dl className="grid grid-cols-3 gap-6">
              {[
                { label: 'Ingresos', value: summary.ingreso },
                { label: 'Extras', value: summary.extra },
                { label: 'Gastos', value: summary.gasto },
              ].map((stat) => (
                <div key={stat.label}>
                  <dt className="text-xs text-muted">{stat.label}</dt>
                  <dd>
                    <AnimatedMoney value={stat.value} className="text-base font-medium" />
                  </dd>
                </div>
              ))}
            </dl>
          </div>
          <SpendBar spent={summary.gasto} earned={summary.ingreso + summary.extra} />
        </section>
      )}

      {transactions && <Breakdown transactions={transactions} />}

      <QuickAdd defaultDate={defaultDate} />

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

      {error && (
        <p role="alert" className="text-sm text-expense">
          {error.message}
        </p>
      )}

      {isPending || !transactions ? (
        <div className="space-y-3">
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
        </div>
      ) : transactions.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="Sin movimientos en este periodo"
          text="Toca el botón + para registrar un gasto o un ingreso."
        />
      ) : (
        <div className="space-y-6">
          {groupByDay(transactions).map(([day, items]) => {
            const net = dayNet(items)
            return (
              <section key={day} className="space-y-2.5">
                <div className="flex items-baseline justify-between px-1">
                  <h2 className="text-sm font-semibold first-letter:uppercase">{dayLabel(day)}</h2>
                  <span className="num text-xs text-muted">
                    {net < 0 ? '−' : '+'}
                    {formatMoney(Math.abs(net))}
                  </span>
                </div>
                <ul className="card divide-y divide-border overflow-hidden">
                  {items.map((item, index) => {
                    const Icon = kindIcon[item.kind]
                    return editingId === item.id ? (
                      <li key={item.id} className="bg-raised">
                        <TransactionForm
                          defaultDate={item.occurred_on}
                          transaction={item}
                          onDone={() => setEditingId(null)}
                        />
                      </li>
                    ) : (
                      <li
                        key={item.id}
                        className="group flex animate-slide-in items-center gap-3.5 px-4 py-3.5 transition-colors duration-200 hover:bg-raised"
                        style={{ animationDelay: `${Math.min(index, 8) * 35}ms` }}
                      >
                        <span
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${kindTone[item.kind]}`}
                        >
                          <Icon size={18} strokeWidth={1.75} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium">{item.concept}</p>
                          <p className="truncate text-xs text-muted">
                            {kindLabels[item.kind]}
                            {item.categories && ` · ${item.categories.name}`}
                            {item.reason && ` · ${item.reason}`}
                          </p>
                        </div>
                        <span
                          className={`num shrink-0 font-semibold ${
                            item.kind === 'gasto' ? 'text-expense' : 'text-income'
                          }`}
                        >
                          {sign[item.kind]}
                          {formatMoney(Number(item.amount))}
                        </span>
                        <div className="flex shrink-0 items-center md:opacity-0 md:transition-opacity md:duration-200 md:group-focus-within:opacity-100 md:group-hover:opacity-100">
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
                    )
                  })}
                </ul>
              </section>
            )
          })}
        </div>
      )}

      <DebtsInvite />

      <div className="space-y-4">
        <RecurringManager />
        <CategoryManager />
      </div>
    </div>
  )
}
