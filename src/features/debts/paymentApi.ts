import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { supabase } from '../../lib/supabase'

export const paymentSchema = z.object({
  amount: z.coerce.number().positive('El abono debe ser mayor a 0').max(999999999.99),
  paid_on: z.string().date('Fecha inválida'),
})

export type PaymentInput = z.infer<typeof paymentSchema>

export type Payment = PaymentInput & { id: string; debt_id: string }

export const usePayments = (debtId: string, enabled: boolean) =>
  useQuery({
    queryKey: ['payments', debtId],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('debt_payments')
        .select('id, debt_id, amount, paid_on')
        .eq('debt_id', debtId)
        .order('paid_on', { ascending: false })
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as Payment[]
    },
  })

export const useAddPayment = (debtId: string) => {
  const client = useQueryClient()
  return useMutation({
    mutationFn: async (input: PaymentInput) => {
      const { data: auth } = await supabase.auth.getUser()
      const { error } = await supabase
        .from('debt_payments')
        .insert({ ...input, debt_id: debtId, user_id: auth.user?.id })
      if (error) throw error
    },
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ['payments', debtId] })
      client.invalidateQueries({ queryKey: ['debts'] })
    },
  })
}
