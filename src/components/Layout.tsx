import { Suspense } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { useAuth } from '../app/useAuth'
import { useTheme } from '../app/useTheme'
import { supabase } from '../lib/supabase'
import { useGenerateRecurring } from '../features/transactions/recurringApi'
import { PageSkeleton } from './Skeleton'

const sections = [
  { to: '/bills', label: 'Bills' },
  { to: '/movimientos', label: 'Movimientos' },
  { to: '/plan', label: 'Plan' },
  { to: '/asesor', label: 'Asesor' },
  { to: '/ajustes', label: 'Ajustes' },
]

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
    isActive ? 'bg-accent/15 text-accent' : 'text-muted hover:text-text'
  }`

export function Layout() {
  const { theme, toggle } = useTheme()
  const { session } = useAuth()
  const signOut = () => supabase.auth.signOut()
  const location = useLocation()
  useGenerateRecurring()

  return (
    <div className="min-h-screen md:flex">
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-border bg-surface px-4 py-2 md:hidden">
        <span className="text-lg font-bold text-accent">CYB</span>
        <div className="flex gap-2">
          <button
            onClick={toggle}
            aria-label={`Cambiar a tema ${theme === 'light' ? 'oscuro' : 'claro'}`}
            className="rounded-lg border border-border px-3 py-1.5 text-sm text-muted hover:text-text"
          >
            {theme === 'light' ? 'Oscuro' : 'Claro'}
          </button>
          <button
            onClick={signOut}
            className="rounded-lg border border-border px-3 py-1.5 text-sm text-muted hover:text-expense"
          >
            Salir
          </button>
        </div>
      </header>
      <aside className="hidden w-56 shrink-0 flex-col gap-1 border-r border-border bg-surface p-4 md:flex">
        <span className="mb-4 text-lg font-bold text-accent">CYB</span>
        {sections.map((section) => (
          <NavLink key={section.to} to={section.to} className={linkClass}>
            {section.label}
          </NavLink>
        ))}
        <div className="mt-auto space-y-2">
          <p className="truncate px-1 text-xs text-muted" title={session?.user.email}>
            {session?.user.email}
          </p>
          <button
            onClick={toggle}
            className="w-full rounded-lg border border-border px-3 py-2 text-sm text-muted hover:text-text"
          >
            Tema {theme === 'light' ? 'oscuro' : 'claro'}
          </button>
          <button
            onClick={signOut}
            className="w-full rounded-lg border border-border px-3 py-2 text-sm text-muted hover:text-expense"
          >
            Cerrar sesión
          </button>
        </div>
      </aside>
      <main className="flex-1 p-4 pb-24 md:p-8 md:pb-8">
        <Suspense fallback={<PageSkeleton />}>
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </Suspense>
      </main>
      <nav className="fixed inset-x-0 bottom-0 flex justify-around border-t border-border bg-surface p-2 md:hidden">
        {sections.map((section) => (
          <NavLink key={section.to} to={section.to} className={linkClass}>
            {section.label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
