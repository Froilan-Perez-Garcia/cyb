import { z } from 'zod'

export const debtTypes = ['tarjeta', 'prestamo', 'personal', 'otro'] as const

export const debtTypeLabels: Record<(typeof debtTypes)[number], string> = {
  tarjeta: 'Tarjeta de crédito',
  prestamo: 'Préstamo bancario',
  personal: 'Personal / informal',
  otro: 'Otro',
}

export const isFormalDebt = (type: (typeof debtTypes)[number]) =>
  type === 'tarjeta' || type === 'prestamo'

const money = z.coerce.number().min(0, 'Debe ser 0 o más').max(999999999.99)

export const debtSchema = z.object({
  type: z.enum(debtTypes),
  alias: z.string().trim().min(1, 'Escribe un nombre').max(60),
  total_balance: money,
  statement_balance: money,
  minimum_payment: money,
  monthly_rate: z.coerce.number().min(0).max(100),
  cat: z.preprocess((v) => (v === '' ? null : v), z.coerce.number().min(0).max(99999).nullable()),
  due_day: z.preprocess(
    (v) => (v === '' ? null : v),
    z.coerce.number().int().min(1).max(31).nullable(),
  ),
})

export type DebtInput = z.infer<typeof debtSchema>

export type Debt = DebtInput & { id: string; priority: number; created_at: string }
