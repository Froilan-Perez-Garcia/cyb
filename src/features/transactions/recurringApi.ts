import { useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { supabase } from '../../lib/supabase'

export const frequencies = ['semanal', 'quincenal', 'mensual'] as const

export const frequencyLabels: Record<(typeof frequencies)[number], string> = {
  semanal: 'Cada semana',
  quincenal: 'Cada quincena',
  mensual: 'Cada mes',
}

export const recurringSchema = z.object({
  kind: z.enum(['ingreso', 'gasto']),
  concept: z.string().trim().min(1, 'Escribe un concepto').max(120),
  amount: z.coerce.number().positive('El monto debe ser mayor a 0').max(999999999.99),
  frequency: z.enum(frequencies),
  next_on: z.string().date('Fecha inválida'),
  category_id: z.preprocess(
    (v) => (v === '' || v === undefined ? null : v),
    z.string().uuid().nullable(),
  ),
})

export type RecurringInput = z.infer<typeof recurringSchema>

export type RecurringItem = RecurringInput & {
  id: string
  categories: { name: string; essential: boolean } | null
}

export const useRecurring = () =>
  useQuery({
    queryKey: ['recurring'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('recurring_items')
        .select(
          'id, kind, concept, amount, frequency, next_on, category_id, categories(name, essential)',
        )
        .order('next_on')
      if (error) throw error
      return data as unknown as RecurringItem[]
    },
  })

const generate = async () => {
  const { data, error } = await supabase.rpc('generate_recurring')
  if (error) throw error
  return data as number
}

export const useGenerateRecurring = () => {
  const client = useQueryClient()
  useEffect(() => {
    generate()
      .then((created) => {
        if (created > 0) {
          client.invalidateQueries({ queryKey: ['transactions'] })
          client.invalidateQueries({ queryKey: ['recurring'] })
        }
      })
      .catch(() => undefined)
  }, [client])
}

export const useAddRecurring = () => {
  const client = useQueryClient()
  return useMutation({
    mutationFn: async (input: RecurringInput) => {
      const { data: auth } = await supabase.auth.getUser()
      const { error } = await supabase
        .from('recurring_items')
        .insert({ ...input, user_id: auth.user?.id })
      if (error) throw error
      await generate().catch(() => undefined)
    },
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ['recurring'] })
      client.invalidateQueries({ queryKey: ['transactions'] })
    },
  })
}

export const useUpdateRecurring = () => {
  const client = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: RecurringInput }) => {
      const { error } = await supabase.from('recurring_items').update(input).eq('id', id)
      if (error) throw error
      await generate().catch(() => undefined)
    },
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ['recurring'] })
      client.invalidateQueries({ queryKey: ['transactions'] })
    },
  })
}

export const useDeleteRecurring = () => {
  const client = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('recurring_items').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => client.invalidateQueries({ queryKey: ['recurring'] }),
  })
}
