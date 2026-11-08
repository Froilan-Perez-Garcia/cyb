import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { toIso } from '../transactions/period'
import type { HistoryEntry } from './capacity'
import type { Method } from './engine'

export type Profile = {
  method: Method
  method_chosen: boolean
  ai_consent: boolean
  buffer_percent: number
}

export const useProfile = () =>
  useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('method, method_chosen, buffer_percent, ai_consent')
        .single()
      if (error) throw error
      return { ...data, buffer_percent: Number(data.buffer_percent) } as Profile
    },
  })

export const useUpdateProfile = () => {
  const client = useQueryClient()
  return useMutation({
    mutationFn: async (changes: Partial<Profile>) => {
      const { data: auth } = await supabase.auth.getUser()
      const { error } = await supabase.from('profiles').update(changes).eq('id', auth.user?.id)
      if (error) throw error
    },
    onSuccess: () => client.invalidateQueries({ queryKey: ['profile'] }),
  })
}

export const useSavePriorities = () => {
  const client = useQueryClient()
  return useMutation({
    mutationFn: async (orderedIds: string[]) => {
      const results = await Promise.all(
        orderedIds.map((id, index) =>
          supabase.from('debts').update({ priority: index }).eq('id', id),
        ),
      )
      const failed = results.find((result) => result.error)
      if (failed?.error) throw failed.error
    },
    onSuccess: () => client.invalidateQueries({ queryKey: ['debts'] }),
  })
}

export const usePlanHistory = () =>
  useQuery({
    queryKey: ['transactions', 'plan-history'],
    queryFn: async () => {
      const now = new Date()
      const from = toIso(new Date(now.getFullYear(), now.getMonth() - 3, 1))
      const { data, error } = await supabase
        .from('transactions')
        .select('kind, amount, occurred_on, categories(essential)')
        .gte('occurred_on', from)
      if (error) throw error
      return (
        data as unknown as {
          kind: HistoryEntry['kind']
          amount: number
          occurred_on: string
          categories: { essential: boolean } | null
        }[]
      ).map<HistoryEntry>((row) => ({
        kind: row.kind,
        amount: Number(row.amount),
        occurred_on: row.occurred_on,
        essential: row.categories?.essential ?? false,
      }))
    },
  })
