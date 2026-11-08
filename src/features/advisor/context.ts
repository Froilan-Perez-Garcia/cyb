import type { Capacity } from '../plan/capacity'
import type { Method, Plan } from '../plan/engine'

const round = (value: number) => Math.round(value * 100) / 100

export function buildContext(
  plan: Plan,
  capacity: Capacity,
  method: Method,
  typeById: Map<string, string>,
) {
  const detail = new Map(plan.plan.debts.map((item) => [item.id, item]))
  return {
    method,
    capacity: {
      status: capacity.status,
      income: round(capacity.income),
      essentials: round(capacity.essentials),
      minimums: round(capacity.minimums),
      available: capacity.status === 'ok' ? round(capacity.available) : 0,
      shortfall: capacity.status === 'deficit' ? round(capacity.shortfall) : 0,
    },
    summary: {
      monthsToFree: plan.plan.months,
      totalInterest: round(plan.plan.totalInterest),
      interestSaved: plan.interestSaved === null ? null : round(plan.interestSaved),
    },
    debts: plan.ordered.map((debt, index) => ({
      label: `Deuda ${index + 1}`,
      type: typeById.get(debt.id) ?? 'otro',
      balance: round(debt.balance),
      minimum: round(debt.minimum),
      monthlyRate: debt.rate,
      suggestedMonthly: round(detail.get(debt.id)?.firstPayment ?? 0),
      payoffMonths: detail.get(debt.id)?.payoffMonth ?? null,
    })),
  }
}

export type AdvisorContext = ReturnType<typeof buildContext>
