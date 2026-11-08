import { useContext } from 'react'
import { AuthContext } from './authContext'

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth requiere AuthProvider')
  return context
}
