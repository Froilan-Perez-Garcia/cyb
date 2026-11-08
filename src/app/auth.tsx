import { useEffect, useState, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { AuthContext } from './authContext'

export function AuthProvider({ children }: { children: ReactNode }) {
  const client = useQueryClient()
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })
    const { data } = supabase.auth.onAuthStateChange((event, next) => {
      if (event === 'SIGNED_OUT') {
        client.clear()
        try {
          sessionStorage.removeItem('cyb-advisor')
        } catch {
          return
        }
      }
      setSession(next)
    })
    return () => data.subscription.unsubscribe()
  }, [client])

  return <AuthContext.Provider value={{ session, loading }}>{children}</AuthContext.Provider>
}
