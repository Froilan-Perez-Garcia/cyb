export type Method = 'avalancha' | 'bola_de_nieve' | 'personalizado'

export type PlanDebt = {
  id: string
  alias: string
  balance: number
  minimum: number
  rate: number
  priority: number
}

export type DebtResult = {
  id: string
  firstPayment: number
  payoffMonth: number | null
  interest: number
}

export type Simulation = {
  months: number | null
  totalInterest: number
  debts: DebtResult[]
}

const MAX_MONTHS = 600
const EPSILON = 0.005

export function orderDebts(debts: PlanDebt[], method: Method): PlanDebt[] {
  const sorted = [...debts]
  if (method === 'avalancha') {
    return sorted.sort((a, b) => b.rate - a.rate || a.balance - b.balance)
  }
  if (method === 'bola_de_nieve') {
    return sorted.sort((a, b) => a.balance - b.balance || b.rate - a.rate)
  }
  return sorted.sort((a, b) => a.priority - b.priority)
}

function simulate(ordered: PlanDebt[], extra: number, rollover: boolean): Simulation {
  const balances = new Map(ordered.map((debt) => [debt.id, debt.balance]))
  const results = new Map<string, DebtResult>(
    ordered.map((debt) => [
      debt.id,
      { id: debt.id, firstPayment: 0, payoffMonth: null, interest: 0 },
    ]),
  )
  const budget = ordered.reduce((sum, debt) => sum + debt.minimum, 0) + extra

  let month = 0
  while (month < MAX_MONTHS) {
    const active = ordered.filter((debt) => (balances.get(debt.id) ?? 0) > EPSILON)
    if (active.length === 0) break
    month += 1

    for (const debt of active) {
      const balance = balances.get(debt.id) ?? 0
      const interest = (balance * debt.rate) / 100
      balances.set(debt.id, balance + interest)
      const result = results.get(debt.id)
      if (result) result.interest += interest
    }

    let remaining = budget
    const pay = (debt: PlanDebt, amount: number) => {
      const balance = balances.get(debt.id) ?? 0
      const applied = Math.min(amount, balance)
      balances.set(debt.id, balance - applied)
      remaining -= applied
      const result = results.get(debt.id)
      if (result && month === 1) result.firstPayment += applied
      return applied
    }

    for (const debt of active) pay(debt, debt.minimum)

    if (rollover) {
      for (const debt of active) {
        if (remaining <= EPSILON) break
        pay(debt, remaining)
      }
    }

    for (const debt of active) {
      const result = results.get(debt.id)
      if (result && result.payoffMonth === null && (balances.get(debt.id) ?? 0) <= EPSILON) {
        result.payoffMonth = month
      }
    }
  }

  const finished = ordered.every((debt) => (balances.get(debt.id) ?? 0) <= EPSILON)
  const list = [...results.values()]
  return {
    months: finished ? month : null,
    totalInterest: list.reduce((sum, item) => sum + item.interest, 0),
    debts: list,
  }
}

export type Plan = {
  ordered: PlanDebt[]
  plan: Simulation
  baseline: Simulation
  interestSaved: number | null
  monthsSaved: number | null
}

export function buildPlan(debts: PlanDebt[], method: Method, extra: number): Plan {
  const ordered = orderDebts(debts, method)
  const plan = simulate(ordered, Math.max(0, extra), true)
  const baseline = simulate(ordered, 0, false)
  const baselineClearsInterest = ordered.every(
    (debt) =>
      debt.rate <= 0 || baseline.debts.find((item) => item.id === debt.id)?.payoffMonth !== null,
  )
  const bothFinish = plan.months !== null && baseline.months !== null
  return {
    ordered,
    plan,
    baseline,
    interestSaved:
      baselineClearsInterest && plan.months !== null
        ? baseline.totalInterest - plan.totalInterest
        : null,
    monthsSaved: bothFinish ? (baseline.months as number) - (plan.months as number) : null,
  }
}
