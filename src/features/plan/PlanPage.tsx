import { useState } from 'react'
import { Skeleton } from '../../components/Skeleton'
import { formatMoney } from '../../lib/format'
import { debtTypeLabels } from '../debts/schema'
import { useSavePriorities, useUpdateProfile } from './api'
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

function Row({ label, value, tone = '' }: { label: string; value: string; tone?: string }) {
  return (
    <div className="flex justify-between gap-4 text-sm">
      <dt className="text-muted">{label}</dt>
      <dd className={`font-medium ${tone}`}>{value}</dd>
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
      <div className="space-y-4">
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    )
  }

  if (failure) return <p className="text-expense">{failure.message}</p>

  if (!profile.data || planDebts.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Tu plan de pago</h1>
        <p className="rounded-2xl border border-dashed border-border p-8 text-center text-muted">
          Registra al menos una deuda con saldo en Bills para ver tu plan.
        </p>
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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Tu plan de pago</h1>
          <p className="text-sm text-muted">Método: {methodLabels[profile.data.method]}</p>
        </div>
        {planDebts.length >= 2 && (
          <button
            onClick={() => setModalOpen(true)}
            className="rounded-lg border border-border px-4 py-2 text-sm text-muted hover:text-text"
          >
            Cambiar método
          </button>
        )}
      </div>

      {capacity && (
        <section className="space-y-3 rounded-2xl border border-border bg-surface p-4">
          <h2 className="font-semibold">Capacidad de pago mensual</h2>
          <dl className="space-y-1.5">
            <Row label="Ingresos" value={formatMoney(capacity.income)} tone="text-income" />
            <Row
              label="Gastos de vida esenciales"
              value={`− ${formatMoney(capacity.essentials)}`}
            />
            <Row label="Pagos mínimos de deudas" value={`− ${formatMoney(capacity.minimums)}`} />
            {capacity.status === 'ok' && (
              <>
                <Row
                  label={`Colchón (${profile.data.buffer_percent}%)`}
                  value={`− ${formatMoney(capacity.buffer)}`}
                />
                <div className="border-t border-border pt-2">
                  <Row
                    label="Disponible para abonar de más"
                    value={formatMoney(capacity.available)}
                    tone="text-accent"
                  />
                </div>
              </>
            )}
          </dl>

          {capacity.status === 'sin_datos' && (
            <p className="rounded-lg bg-bg p-3 text-sm text-muted">
              Aún no hay ingresos registrados. Agrega tu ingreso como recurrente (o registra
              ingresos de los últimos 3 meses) en Movimientos para calcular tu capacidad.
            </p>
          )}
          {capacity.status === 'deficit' && (
            <p className="rounded-lg border border-expense p-3 text-sm text-expense">
              Con tus ingresos, gastos esenciales y pagos mínimos te faltan{' '}
              {formatMoney(capacity.shortfall)} al mes. No propongo recortar tus gastos esenciales:
              el plan solo muestra los pagos mínimos.
            </p>
          )}

          <label className="flex items-center gap-2 text-sm text-muted">
            Colchón para imprevistos (%)
            <input
              key={profile.data.buffer_percent}
              type="number"
              min="0"
              max="100"
              step="1"
              defaultValue={profile.data.buffer_percent}
              onBlur={(event) => {
                const value = Number(event.target.value)
                if (value >= 0 && value <= 100 && value !== profile.data?.buffer_percent) {
                  updateProfile.mutate({ buffer_percent: value })
                }
              }}
              className="w-20 rounded-lg border border-border bg-bg px-2 py-1 text-text outline-none focus:border-accent"
            />
          </label>
        </section>
      )}

      {result && capacity && capacity.status !== 'sin_datos' && (
        <>
          {capacity.status === 'ok' && (
            <section className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-border bg-surface p-4">
                <p className="text-sm text-muted">Libre de deudas en</p>
                <p className="text-lg font-bold">{monthsLabel(result.plan.months)}</p>
                <p className="text-xs text-muted first-letter:uppercase">
                  {payoffLabel(result.plan.months)}
                </p>
              </div>
              <div className="rounded-2xl border border-border bg-surface p-4">
                <p className="text-sm text-muted">Interés total estimado</p>
                <p className="text-lg font-bold text-expense">
                  {formatMoney(result.plan.totalInterest)}
                </p>
              </div>
              <div className="rounded-2xl border border-border bg-surface p-4">
                <p className="text-sm text-muted">Ahorras vs. solo mínimos</p>
                <p className="text-lg font-bold text-income">
                  {result.interestSaved === null ? '—' : formatMoney(result.interestSaved)}
                </p>
                {result.monthsSaved !== null && result.monthsSaved > 0 && (
                  <p className="text-xs text-muted">{monthsLabel(result.monthsSaved)} menos</p>
                )}
              </div>
            </section>
          )}

          <ol className="space-y-3">
            {result.ordered.map((ordered, index) => {
              const detail = result.plan.debts.find((item) => item.id === ordered.id)
              const debt = byId.get(ordered.id)
              const full = fullDebts.get(ordered.id)
              if (!detail || !debt) return null
              return (
                <li
                  key={ordered.id}
                  className="space-y-2 rounded-2xl border border-border bg-surface p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent/15 text-sm font-bold text-accent">
                        {index + 1}
                      </span>
                      <div>
                        <p className="font-semibold">{debt.alias}</p>
                        <p className="text-xs text-muted">
                          {full ? debtTypeLabels[full.type] : ''}
                          {debt.rate > 0 && ` · ${debt.rate}% mensual`}
                        </p>
                      </div>
                    </div>
                    <p className="font-bold text-expense">{formatMoney(debt.balance)}</p>
                  </div>
                  <dl className="space-y-1">
                    <Row
                      label="Abono sugerido al mes"
                      value={formatMoney(detail.firstPayment)}
                      tone="text-accent"
                    />
                    <Row
                      label="Aproximado por quincena"
                      value={formatMoney(detail.firstPayment / 2)}
                    />
                    {capacity.status === 'ok' && (
                      <>
                        <Row label="Liquidación estimada" value={payoffLabel(detail.payoffMonth)} />
                        <Row label="Interés estimado" value={formatMoney(detail.interest)} />
                      </>
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
