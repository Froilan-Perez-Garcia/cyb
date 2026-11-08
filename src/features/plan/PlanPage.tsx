import { useState } from 'react'
import { ShieldAlert, SlidersHorizontal, Target } from 'lucide-react'
import { AnimatedMoney } from '../../components/AnimatedMoney'
import { EmptyState } from '../../components/EmptyState'
import { PageHeader } from '../../components/PageHeader'
import { Skeleton } from '../../components/Skeleton'
import { formatMoney } from '../../lib/format'
import { rateTone } from '../debts/rate'
import { debtTypeLabels } from '../debts/schema'
import { useSavePriorities, useUpdateProfile } from './api'
import type { Capacity } from './capacity'
import { type Method } from './engine'
import { MethodModal } from './MethodModal'
import { usePlan } from './usePlan'

const methodLabels: Record<Method, string> = {
  avalancha: 'Avalancha',
  bola_de_nieve: 'Bola de nieve',
  personalizado: 'Personalizado',
}

const payoffLabel = (months: number | null) => {
  if (months === null) return 'No se liquida con este plan'
  const date = new Date()
  date.setMonth(date.getMonth() + months)
  return date.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })
}

const monthsLabel = (months: number | null) => {
  if (months === null) return 'Sin liquidar'
  const years = Math.floor(months / 12)
  const rest = months % 12
  const parts = []
  if (years) parts.push(`${years} ${years === 1 ? 'año' : 'años'}`)
  if (rest || !years) parts.push(`${rest} ${rest === 1 ? 'mes' : 'meses'}`)
  return parts.join(' y ')
}

function Stat({ label, value, tone = '' }: { label: string; value: string; tone?: string }) {
  return (
    <div>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className={`num text-sm font-medium ${tone}`}>{value}</dd>
    </div>
  )
}

type Split = { label: string; value: number; bar: string }

function Waterfall({
  capacity,
  buffer,
}: {
  capacity: Extract<Capacity, { status: 'ok' }>
  buffer: number
}) {
  const parts: Split[] = [
    { label: 'Gastos de vida esenciales', value: capacity.essentials, bar: 'bg-muted/50' },
    { label: 'Pagos mínimos de deudas', value: capacity.minimums, bar: 'bg-warn' },
    { label: `Colchón (${buffer}%)`, value: capacity.buffer, bar: 'bg-accent/35' },
    { label: 'Disponible para abonar de más', value: capacity.available, bar: 'bg-accent' },
  ]

  return (
    <div className="space-y-5">
      <div
        className="flex h-3 gap-1 overflow-hidden rounded-full"
        role="img"
        aria-label="Cómo se reparte tu ingreso mensual"
      >
        {parts
          .filter((part) => part.value > 0)
          .map((part, index) => (
            <span
              key={part.label}
              className={`basis-0 origin-left animate-grow rounded-full ${part.bar}`}
              style={{ flexGrow: part.value, animationDelay: `${index * 90}ms` }}
            />
          ))}
      </div>
      <ul className="space-y-2.5">
        {parts.map((part) => (
          <li key={part.label} className="flex items-center justify-between gap-4 text-sm">
            <span className="flex items-center gap-2.5 text-muted">
              <span className={`h-2.5 w-2.5 rounded-full ${part.bar}`} />
              {part.label}
            </span>
            <span className="num font-medium">{formatMoney(part.value)}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function PlanPage() {
  const { debts, profile, planDebts, capacity, result, loading, failure } = usePlan()
  const updateProfile = useUpdateProfile()
  const savePriorities = useSavePriorities()
  const [modalOpen, setModalOpen] = useState(false)

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64" />
        <Skeleton className="h-40" />
      </div>
    )
  }

  if (failure) {
    return (
      <p role="alert" className="text-sm text-expense">
        {failure.message}
      </p>
    )
  }

  if (!profile.data || planDebts.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader title="Tu plan de pago" />
        <EmptyState
          icon={Target}
          title="Aún no hay un plan"
          text="Registra al menos una deuda con saldo en Bills para ver tu plan."
        />
      </div>
    )
  }

  const needsChoice = planDebts.length >= 2 && !profile.data.method_chosen
  const showModal = needsChoice || modalOpen

  const confirmMethod = (method: Method, orderedIds: string[]) => {
    if (method === 'personalizado') savePriorities.mutate(orderedIds)
    updateProfile.mutate({ method, method_chosen: true }, { onSuccess: () => setModalOpen(false) })
  }

  const byId = new Map(planDebts.map((debt) => [debt.id, debt]))
  const fullDebts = new Map((debts.data ?? []).map((debt) => [debt.id, debt]))
  const horizon = result ? Math.max(result.plan.months ?? 0, 1) : 1

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tu plan de pago"
        description={`Método: ${methodLabels[profile.data.method]}`}
        actions={
          planDebts.length >= 2 && (
            <button onClick={() => setModalOpen(true)} className="btn btn-secondary">
              <SlidersHorizontal size={16} strokeWidth={1.75} />
              Cambiar método
            </button>
          )
        }
      />

      {capacity && (
        <section className="card animate-slide-in space-y-6 p-5 md:p-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-sm text-muted">Capacidad de pago mensual</h2>
              <AnimatedMoney
                value={capacity.income}
                className="block text-3xl font-semibold text-income md:text-4xl"
              />
              <p className="text-xs text-muted">de ingresos al mes</p>
            </div>
          </div>

          {capacity.status === 'ok' ? (
            <Waterfall capacity={capacity} buffer={profile.data.buffer_percent} />
          ) : (
            <ul className="space-y-2.5 text-sm">
              <li className="flex justify-between gap-4">
                <span className="text-muted">Gastos de vida esenciales</span>
                <span className="num font-medium">− {formatMoney(capacity.essentials)}</span>
              </li>
              <li className="flex justify-between gap-4">
                <span className="text-muted">Pagos mínimos de deudas</span>
                <span className="num font-medium">− {formatMoney(capacity.minimums)}</span>
              </li>
            </ul>
          )}

          {capacity.status === 'sin_datos' && (
            <p className="card-inset px-4 py-3 text-sm text-muted">
              Aún no hay ingresos registrados. Agrega tu ingreso como recurrente (o registra
              ingresos de los últimos 3 meses) en Movimientos para calcular tu capacidad.
            </p>
          )}
          {capacity.status === 'deficit' && (
            <div
              role="alert"
              className="flex gap-3 rounded-xl border border-expense/30 bg-expense/10 px-4 py-3 text-sm text-expense"
            >
              <ShieldAlert size={18} strokeWidth={1.75} className="mt-0.5 shrink-0" />
              <p>
                Con tus ingresos, gastos esenciales y pagos mínimos te faltan{' '}
                <span className="num font-semibold">{formatMoney(capacity.shortfall)}</span> al mes.
                No propongo recortar tus gastos esenciales: el plan solo muestra los pagos mínimos.
              </p>
            </div>
          )}

          <label className="flex items-center justify-between gap-4 border-t border-border pt-5 text-sm">
            <span className="text-muted">Colchón para imprevistos</span>
            <span className="relative block w-28">
              <input
                key={profile.data.buffer_percent}
                type="number"
                min="0"
                max="100"
                step="1"
                aria-label="Colchón para imprevistos en porcentaje"
                defaultValue={profile.data.buffer_percent}
                onBlur={(event) => {
                  const value = Number(event.target.value)
                  if (value >= 0 && value <= 100 && value !== profile.data?.buffer_percent) {
                    updateProfile.mutate({ buffer_percent: value })
                  }
                }}
                className="input pr-8 text-right"
              />
              <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-sm text-muted">
                %
              </span>
            </span>
          </label>
        </section>
      )}

      {result && capacity && capacity.status !== 'sin_datos' && (
        <>
          {capacity.status === 'ok' && (
            <section
              className="card animate-slide-in grid divide-y divide-border sm:grid-cols-3 sm:divide-x sm:divide-y-0"
              style={{ animationDelay: '80ms' }}
            >
              <div className="space-y-1 p-5">
                <p className="text-sm text-muted">Libre de deudas en</p>
                <p className="text-2xl font-semibold">{monthsLabel(result.plan.months)}</p>
                <p className="text-xs text-muted first-letter:uppercase">
                  {payoffLabel(result.plan.months)}
                </p>
              </div>
              <div className="space-y-1 p-5">
                <p className="text-sm text-muted">Interés total estimado</p>
                <AnimatedMoney
                  value={result.plan.totalInterest}
                  className="block text-2xl font-semibold text-expense"
                />
              </div>
              <div className="space-y-1 p-5">
                <p className="text-sm text-muted">Ahorras vs. solo mínimos</p>
                {result.interestSaved === null ? (
                  <p className="text-2xl font-semibold">—</p>
                ) : (
                  <AnimatedMoney
                    value={result.interestSaved}
                    className="block text-2xl font-semibold text-income"
                  />
                )}
                {result.monthsSaved !== null && result.monthsSaved > 0 && (
                  <p className="text-xs text-muted">{monthsLabel(result.monthsSaved)} menos</p>
                )}
              </div>
            </section>
          )}

          <ol className="space-y-4">
            {result.ordered.map((ordered, index) => {
              const detail = result.plan.debts.find((item) => item.id === ordered.id)
              const debt = byId.get(ordered.id)
              const full = fullDebts.get(ordered.id)
              if (!detail || !debt) return null
              const tone = rateTone(debt.rate)
              return (
                <li
                  key={ordered.id}
                  className="card animate-slide-in space-y-5 p-5"
                  style={{ animationDelay: `${140 + index * 70}ms` }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3.5">
                      <span className="num flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/10 text-sm font-semibold text-accent">
                        {index + 1}
                      </span>
                      <div className="min-w-0 space-y-1.5">
                        <h2 className="truncate font-semibold">{debt.alias}</h2>
                        <div className="flex flex-wrap items-center gap-1.5">
                          {full && (
                            <span className="rounded-full bg-raised px-2.5 py-0.5 text-xs font-medium text-muted">
                              {debtTypeLabels[full.type]}
                            </span>
                          )}
                          {debt.rate > 0 && (
                            <span
                              className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${tone.soft}`}
                            >
                              {debt.rate}% mensual
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <p className="num shrink-0 text-lg font-semibold">
                      {formatMoney(debt.balance)}
                    </p>
                  </div>

                  {capacity.status === 'ok' && (
                    <div className="space-y-2">
                      {detail.payoffMonth === null ? (
                        <p className="text-sm text-muted">No se liquida con este plan</p>
                      ) : (
                        <>
                          <div className="h-2 overflow-hidden rounded-full bg-raised">
                            <div
                              className={`h-full origin-left animate-grow rounded-full ${tone.bar}`}
                              style={{
                                width: `${(detail.payoffMonth / horizon) * 100}%`,
                                animationDelay: `${300 + index * 120}ms`,
                              }}
                            />
                          </div>
                          <div className="flex justify-between text-xs text-muted">
                            <span>Hoy</span>
                            <span className="first-letter:uppercase">
                              Liquidada en {payoffLabel(detail.payoffMonth)}
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  <dl className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
                    <Stat
                      label="Abono sugerido al mes"
                      value={formatMoney(detail.firstPayment)}
                      tone="text-accent"
                    />
                    <Stat label="Por quincena" value={formatMoney(detail.firstPayment / 2)} />
                    {capacity.status === 'ok' && (
                      <Stat label="Interés estimado" value={formatMoney(detail.interest)} />
                    )}
                  </dl>
                </li>
              )
            })}
          </ol>
        </>
      )}

      {showModal && (
        <MethodModal
          debts={planDebts}
          current={profile.data.method}
          dismissible={!needsChoice}
          saving={updateProfile.isPending || savePriorities.isPending}
          onConfirm={confirmMethod}
          onClose={() => setModalOpen(false)}
        />
      )}
    </div>
  )
}
