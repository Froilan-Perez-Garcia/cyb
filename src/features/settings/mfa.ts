import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../../lib/supabase'

const idle = { loading: false, required: false, setup: false }

export function useMfaGate(session: Session | null) {
  const [state, setState] = useState({ ...idle, loading: true })
  const userId = session?.user.id

  useEffect(() => {
    let active = true
    setState((current) => ({ ...current, loading: true }))
    if (!userId) {
      setState(idle)
      return
    }
    supabase.auth.mfa.getAuthenticatorAssuranceLevel().then(({ data }) => {
      if (!active) return
      setState({
        loading: false,
        required: data?.nextLevel === 'aal2' && data.currentLevel !== 'aal2',
        setup: data?.nextLevel !== 'aal2',
      })
    })
    return () => {
      active = false
    }
  }, [userId])

  return { ...state, clear: () => setState(idle) }
}

export async function verifyCode(factorId: string, code: string) {
  const challenge = await supabase.auth.mfa.challenge({ factorId })
  if (challenge.error) throw challenge.error
  const verified = await supabase.auth.mfa.verify({
    factorId,
    challengeId: challenge.data.id,
    code,
  })
  if (verified.error) throw verified.error
}
