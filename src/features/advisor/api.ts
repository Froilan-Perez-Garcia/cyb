import { FunctionsHttpError } from '@supabase/supabase-js'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { aiEnabled } from '../../lib/features'
import { supabase } from '../../lib/supabase'
import type { AdvisorContext } from './context'

export const DAILY_LIMIT = 20

const today = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Mexico_City' })

export const useAdvisorUsage = () =>
  useQuery({
    queryKey: ['advisor-usage'],
    enabled: aiEnabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('advisor_usage')
        .select('messages')
        .eq('used_on', today())
        .maybeSingle()
      if (error) throw error
      return data?.messages ?? 0
    },
  })

export type Turn = { role: 'user' | 'assistant'; text: string }

export class LimitReached extends Error {}

export const useAskAdvisor = () => {
  const client = useQueryClient()
  return useMutation({
    mutationFn: async (input: { message: string; history: Turn[]; context: AdvisorContext }) => {
      const { data, error } = await supabase.functions.invoke('advisor', { body: input })
      if (error) {
        if (error instanceof FunctionsHttpError) {
          const body = await error.context.json().catch(() => ({}))
          if (body?.error === 'limit') throw new LimitReached('limit')
          throw new Error(body?.message ?? 'No se pudo consultar al asesor')
        }
        throw error
      }
      return data as { reply: string; used: number }
    },
    onSettled: () => client.invalidateQueries({ queryKey: ['advisor-usage'] }),
  })
}
