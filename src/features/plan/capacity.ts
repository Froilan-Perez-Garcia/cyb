export type Frequency = 'semanal' | 'quincenal' | 'mensual'

export type RecurringInfo = {
  kind: 'ingreso' | 'gasto'
  amount: number
  frequency: Frequency
  essential: boolean
}

export type HistoryEntry = {
  kind: 'ingreso' | 'gasto' | 'extra'
  amount: number
  occurred_on: string
  essential: boolean
}

export type Capacity =
  | { status: 'sin_datos'; income: 0; essentials: number; minimums: number }
  | {
      status: 'deficit'
      income: number
      essentials: number
      minimums: number
      shortfall: number
    }
  | {
      status: 'ok'
      income: number
      essentials: number
      minimums: number
      surplus: number
      buffer: number
      available: number
    }

export const monthlyEquivalent = (frequency: Frequency, amount: number) => {
  if (frequency === 'semanal') return (amount * 52) / 12
  if (frequency === 'quincenal') return amount * 2
  return amount
}

export const lastThreeMonthKeys = (now: Date) =>
  [1, 2, 3].map((back) => {
    const date = new Date(now.getFullYear(), now.getMonth() - back, 1)
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
  })

export function computeCapacity(input: {
  recurring: RecurringInfo[]
  history: HistoryEntry[]
  minimums: number
  bufferPercent: number
  now: Date
}): Capacity {
  const { recurring, history, minimums, bufferPercent, now } = input
  const keys = lastThreeMonthKeys(now)

  const sumByMonth = (match: (entry: HistoryEntry) => boolean) =>
    keys.map((key) =>
      history
        .filter((entry) => entry.occurred_on.startsWith(key) && match(entry))
        .reduce((sum, entry) => sum + entry.amount, 0),
    )

  const fixedIncome = recurring
    .filter((item) => item.kind === 'ingreso')
    .reduce((sum, item) => sum + monthlyEquivalent(item.frequency, item.amount), 0)
  const conservativeIncome = Math.min(...sumByMonth((entry) => entry.kind === 'ingreso'))
  const income = Math.max(fixedIncome, conservativeIncome)

  const fixedEssentials = recurring
    .filter((item) => item.kind === 'gasto' && item.essential)
    .reduce((sum, item) => sum + monthlyEquivalent(item.frequency, item.amount), 0)
  const essentialHistory = sumByMonth((entry) => entry.kind === 'gasto' && entry.essential)
  const averageEssentials = essentialHistory.reduce((sum, value) => sum + value, 0) / 3
  const essentials = Math.max(fixedEssentials, averageEssentials)

  if (income <= 0) return { status: 'sin_datos', income: 0, essentials, minimums }

  const surplus = income - essentials - minimums
  if (surplus <= 0) {
    return { status: 'deficit', income, essentials, minimums, shortfall: -surplus }
  }

  const buffer = (surplus * bufferPercent) / 100
  return {
    status: 'ok',
    income,
    essentials,
    minimums,
    surplus,
    buffer,
    available: surplus - buffer,
  }
}
