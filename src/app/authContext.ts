import { createContext } from 'react'
import type { Session } from '@supabase/supabase-js'

export const AuthContext = createContext<{ session: Session | null; loading: boolean } | null>(null)
