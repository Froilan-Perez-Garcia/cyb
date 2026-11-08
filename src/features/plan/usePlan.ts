import { useMemo } from 'react'
import { useDebts } from '../debts/api'
import { useRecurring } from '../transactions/recurringApi'
import { usePlanHistory, useProfile } from './api'
import { computeCapacity } from './capacity'
import { buildPlan, type PlanDebt } from './engine'

export function usePlan() {
  const debts = useDebts()
  const recurring = useRecurring()
  const history = usePlanHistory()
  const profile = useProfile()

  const planDebts = useMemo<PlanDebt[]>(
    () =>
      (debts.data ?? [])
        .filter((debt) => Number(debt.total_balance) > 0)
        .map((debt) => ({
          id: debt.id,
          alias: debt.alias,
          balance: Number(debt.total_balance),
          minimum: Number(debt.minimum_payment),
          rate: Number(debt.monthly_rate),
          priority: debt.priority,
        })),
    [debts.data],
  )

  const capacity = useMemo(() => {
    if (!recurring.data || !history.data || !profile.data) return null
    return computeCapacity({
      recurring: recurring.data.map((item) => ({
        kind: item.kind,
        amount: Number(item.amount),
        frequency: item.frequency,
        essential: item.categories?.essential ?? false,
      })),
      history: history.data,
      minimums: planDebts.reduce((sum, debt) => sum + debt.minimum, 0),
      bufferPercent: profile.data.buffer_percent,
      now: new Date(),
    })
  }, [recurring.data, history.data, profile.data, planDebts])

  const result = useMemo(() => {
    if (!profile.data || !capacity || planDebts.length === 0) return null
    const extra = capacity.status === 'ok' ? capacity.available : 0
    return buildPlan(planDebts, profile.data.method, extra)
  }, [profile.data, capacity, planDebts])

  return {
    debts,
    profile,
    planDebts,
    capacity,
    result,
    loading: debts.isPending || recurring.isPending || history.isPending || profile.isPending,
    failure: debts.error ?? recurring.error ?? history.error ?? profile.error,
  }
}
