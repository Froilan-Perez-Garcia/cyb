import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import type { Category, Transaction, TransactionInput } from './schema'

export const useTransactions = (from: string, to: string) =>
  useQuery({
    queryKey: ['transactions', from, to],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select('id, kind, concept, amount, occurred_on, category_id, reason, categories(name)')
        .gte('occurred_on', from)
        .lte('occurred_on', to)
        .order('occurred_on', { ascending: false })
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as unknown as Transaction[]
    },
  })

export const useAddTransaction = () => {
  const client = useQueryClient()
  return useMutation({
    mutationFn: async (input: TransactionInput) => {
      const { data: auth } = await supabase.auth.getUser()
      const { error } = await supabase
        .from('transactions')
        .insert({ ...input, user_id: auth.user?.id })
      if (error) throw error
    },
    onSuccess: () => client.invalidateQueries({ queryKey: ['transactions'] }),
  })
}

export const useUpdateTransaction = () => {
  const client = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: TransactionInput }) => {
      const { error } = await supabase.from('transactions').update(input).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => client.invalidateQueries({ queryKey: ['transactions'] }),
  })
}

export const useDeleteTransaction = () => {
  const client = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('transactions').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => client.invalidateQueries({ queryKey: ['transactions'] }),
  })
}

export const useCategories = () =>
  useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('id, name, essential')
        .order('name')
      if (error) throw error
      return data as Category[]
    },
  })

export const useAddCategory = () => {
  const client = useQueryClient()
  return useMutation({
    mutationFn: async (input: { name: string; essential: boolean }) => {
      const { data: auth } = await supabase.auth.getUser()
      const { error } = await supabase
        .from('categories')
        .insert({ ...input, user_id: auth.user?.id })
      if (error) throw error
    },
    onSuccess: () => client.invalidateQueries({ queryKey: ['categories'] }),
  })
}
