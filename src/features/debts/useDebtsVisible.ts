import { useDebtsFlag } from '../../lib/modules'
import { useDebts } from './api'

export function useDebtsVisible() {
  const flag = useDebtsFlag()
  const debts = useDebts()
  const hasDebts = (debts.data?.length ?? 0) > 0
  return { visible: flag || hasDebts, hasDebts }
}
