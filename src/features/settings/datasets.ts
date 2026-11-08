import { toCsv, type Column } from '../../lib/csv'
import { supabase } from '../../lib/supabase'
import { debtTypeLabels, type Debt } from '../debts/schema'
import { frequencyLabels } from '../transactions/recurringApi'
import { kindLabels } from '../transactions/schema'

const PAGE = 1000

async function fetchAll<T>(table: string, select: string, order: string) {
  const rows: T[] = []
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from(table)
      .select(select)
      .order(order)
      .order('id')
      .range(from, from + PAGE - 1)
    if (error) throw error
    rows.push(...(data as unknown as T[]))
    if (data.length < PAGE) return rows
  }
}

type Named = { name: string } | null

const debts: Column<Debt>[] = [
  { label: 'Tipo', value: (r) => debtTypeLabels[r.type] },
  { label: 'Nombre', value: (r) => r.alias },
  { label: 'Deuda total', value: (r) => Number(r.total_balance) },
  { label: 'Saldo a pagar', value: (r) => Number(r.statement_balance) },
  { label: 'Pago mínimo', value: (r) => Number(r.minimum_payment) },
  { label: 'Interés mensual (%)', value: (r) => Number(r.monthly_rate) },
  { label: 'CAT (%)', value: (r) => (r.cat === null ? null : Number(r.cat)) },
  { label: 'Día de pago', value: (r) => r.due_day },
]

type PaymentRow = { amount: number; paid_on: string; debts: { alias: string } | null }

const payments: Column<PaymentRow>[] = [
  { label: 'Fecha', value: (r) => r.paid_on },
  { label: 'Deuda', value: (r) => r.debts?.alias ?? '' },
  { label: 'Monto', value: (r) => Number(r.amount) },
]

type TransactionRow = {
  kind: keyof typeof kindLabels
  concept: string
  amount: number
  occurred_on: string
  reason: string | null
  categories: Named
}

const transactions: Column<TransactionRow>[] = [
  { label: 'Fecha', value: (r) => r.occurred_on },
  { label: 'Tipo', value: (r) => kindLabels[r.kind] },
  { label: 'Concepto', value: (r) => r.concept },
  { label: 'Monto', value: (r) => Number(r.amount) },
  { label: 'Categoría', value: (r) => r.categories?.name ?? '' },
  { label: 'Motivo', value: (r) => r.reason ?? '' },
]

type RecurringRow = {
  kind: 'ingreso' | 'gasto'
  concept: string
  amount: number
  frequency: keyof typeof frequencyLabels
  next_on: string
  categories: Named
}

const recurring: Column<RecurringRow>[] = [
  { label: 'Tipo', value: (r) => kindLabels[r.kind] },
  { label: 'Concepto', value: (r) => r.concept },
  { label: 'Monto', value: (r) => Number(r.amount) },
  { label: 'Frecuencia', value: (r) => frequencyLabels[r.frequency] },
  { label: 'Próxima fecha', value: (r) => r.next_on },
  { label: 'Categoría', value: (r) => r.categories?.name ?? '' },
]

export const datasets = [
  {
    id: 'deudas',
    label: 'Deudas',
    file: 'cyb-deudas.csv',
    build: async () => toCsv(await fetchAll<Debt>('debts', '*', 'created_at'), debts),
  },
  {
    id: 'abonos',
    label: 'Abonos',
    file: 'cyb-abonos.csv',
    build: async () =>
      toCsv(
        await fetchAll<PaymentRow>('debt_payments', 'amount, paid_on, debts(alias)', 'paid_on'),
        payments,
      ),
  },
  {
    id: 'movimientos',
    label: 'Movimientos',
    file: 'cyb-movimientos.csv',
    build: async () =>
      toCsv(
        await fetchAll<TransactionRow>(
          'transactions',
          'kind, concept, amount, occurred_on, reason, categories(name)',
          'occurred_on',
        ),
        transactions,
      ),
  },
  {
    id: 'recurrentes',
    label: 'Recurrentes',
    file: 'cyb-recurrentes.csv',
    build: async () =>
      toCsv(
        await fetchAll<RecurringRow>(
          'recurring_items',
          'kind, concept, amount, frequency, next_on, categories(name)',
          'next_on',
        ),
        recurring,
      ),
  },
]
