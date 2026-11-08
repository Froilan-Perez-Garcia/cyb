import { useContext } from 'react'
import { ThemeContext } from './themeContext'

export const useTheme = () => {
  const context = useContext(ThemeContext)
  if (!context) throw new Error('useTheme requiere ThemeProvider')
  return context
}
