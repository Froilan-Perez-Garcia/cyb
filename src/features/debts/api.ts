import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import type { Debt, DebtInput } from './schema'

const key = ['debts']

export const useDebts = () =>
  useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('debts')
        .select('*')
        .order('monthly_rate', { ascending: false })
      if (error) throw error
      return data as Debt[]
    },
  })

export const useAddDebt = () => {
  const client = useQueryClient()
  return useMutation({
    mutationFn: async (input: DebtInput) => {
      const { data: auth } = await supabase.auth.getUser()
      const { error } = await supabase.from('debts').insert({ ...input, user_id: auth.user?.id })
      if (error) throw error
    },
    onSuccess: () => client.invalidateQueries({ queryKey: key }),
  })
}

export const useUpdateDebt = () => {
  const client = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: DebtInput }) => {
      const { error } = await supabase.from('debts').update(input).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => client.invalidateQueries({ queryKey: key }),
  })
}

export const useDeleteDebt = () => {
  const client = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('debts').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => client.invalidateQueries({ queryKey: key }),
  })
}
