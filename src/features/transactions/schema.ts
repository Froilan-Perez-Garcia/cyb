import { z } from 'zod'

export const kinds = ['gasto', 'ingreso', 'extra'] as const

export const kindLabels: Record<(typeof kinds)[number], string> = {
  gasto: 'Gasto',
  ingreso: 'Ingreso',
  extra: 'Ingreso extra',
}

export const extraReasons = [
  'Bono',
  'Aguinaldo',
  'Pago de alguien que me debía',
  'Venta',
  'Regalo',
  'Otro',
] as const

const optional = (value: unknown) => (value === '' || value === undefined ? null : value)

export const transactionSchema = z.object({
  kind: z.enum(kinds),
  concept: z.string().trim().min(1, 'Escribe un concepto').max(120),
  amount: z.coerce.number().positive('El monto debe ser mayor a 0').max(999999999.99),
  occurred_on: z.string().date('Fecha inválida'),
  category_id: z.preprocess(optional, z.string().uuid().nullable()),
  reason: z.preprocess(optional, z.string().max(60).nullable()),
})

export type TransactionInput = z.infer<typeof transactionSchema>

export type Transaction = TransactionInput & {
  id: string
  categories: { name: string } | null
}

export type Category = { id: string; name: string; essential: boolean }

export function summarize(transactions: Transaction[]) {
  const total = { ingreso: 0, extra: 0, gasto: 0 }
  for (const transaction of transactions) total[transaction.kind] += Number(transaction.amount)
  return { ...total, balance: total.ingreso + total.extra - total.gasto }
}
