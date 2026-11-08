import { Suspense, useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowLeftRight,
  ChevronLeft,
  CreditCard,
  LogOut,
  MessagesSquare,
  Moon,
  Settings,
  Sun,
  Target,
  type LucideIcon,
} from 'lucide-react'
import { useAuth } from '../app/useAuth'
import { useTheme } from '../app/useTheme'
import { useGenerateRecurring } from '../features/transactions/recurringApi'
import { supabase } from '../lib/supabase'
import { ColorMenu } from './ColorMenu'
import { Logo } from './Logo'
import { PageSkeleton } from './Skeleton'

const sections: { to: string; label: string; icon: LucideIcon }[] = [
  { to: '/bills', label: 'Bills', icon: CreditCard },
  { to: '/movimientos', label: 'Movimientos', icon: ArrowLeftRight },
  { to: '/plan', label: 'Plan', icon: Target },
  { to: '/asesor', label: 'Asesor', icon: MessagesSquare },
  { to: '/ajustes', label: 'Ajustes', icon: Settings },
]

const spring = { type: 'spring', stiffness: 520, damping: 40 } as const

const RAIL_KEY = 'cyb-rail'

type RailPreference = 'collapsed' | 'expanded'

const NARROW_QUERY = '(max-width: 1099px)'

const readPreference = (): RailPreference | null => {
  try {
    const value = localStorage.getItem(RAIL_KEY)
    return value === 'collapsed' || value === 'expanded' ? value : null
  } catch {
    return null
  }
}

function useNarrow() {
  const [narrow, setNarrow] = useState(() => window.matchMedia(NARROW_QUERY).matches)

  useEffect(() => {
    const query = window.matchMedia(NARROW_QUERY)
    const onChange = () => setNarrow(query.matches)
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [])

  return narrow
}

const labelClass = (collapsed: boolean) =>
  `overflow-hidden whitespace-nowrap transition-[max-width,opacity] duration-300 ease-out ${
    collapsed ? 'max-w-0 opacity-0' : 'max-w-40 opacity-100'
  }`

const railItem =
  'relative flex h-11 w-full items-center gap-3 rounded-xl px-[15px] text-sm font-medium text-rail-muted transition-colors duration-200 hover:text-rail-text'

function RailLink({
  to,
  label,
  icon: Icon,
  collapsed,
}: (typeof sections)[number] & { collapsed: boolean }) {
  return (
    <NavLink
      to={to}
      title={collapsed ? label : undefined}
      aria-label={label}
      className={`${railItem} aria-[current=page]:text-rail-text`}
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <motion.span
              layoutId="rail-pill"
              transition={spring}
              className="absolute inset-0 rounded-xl bg-white/10"
            />
          )}
          <Icon
            size={18}
            strokeWidth={1.75}
            className={`relative z-10 shrink-0 transition-colors duration-200 ${isActive ? 'text-rail-accent' : ''}`}
          />
          <span className={`relative z-10 ${labelClass(collapsed)}`}>{label}</span>
        </>
      )}
    </NavLink>
  )
}

function TabLink({ to, label, icon: Icon }: (typeof sections)[number]) {
  return (
    <NavLink
      to={to}
      className="flex flex-col items-center gap-0.5 pb-2 pt-2.5 text-[11px] font-medium text-muted transition-colors duration-200 aria-[current=page]:text-text"
    >
      {({ isActive }) => (
        <>
          <span className="relative flex h-8 w-14 items-center justify-center">
            {isActive && (
              <motion.span
                layoutId="tab-pill"
                transition={spring}
                className="absolute inset-0 rounded-full bg-accent/15"
              />
            )}
            <Icon
              size={20}
              strokeWidth={1.75}
              className={`relative z-10 transition-colors duration-200 ${isActive ? 'text-accent' : ''}`}
            />
          </span>
          {label}
        </>
      )}
    </NavLink>
  )
}

function ThemeButton({ className = '' }: { className?: string }) {
  const { theme, toggle } = useTheme()
  const Icon = theme === 'light' ? Moon : Sun
  return (
    <button
      onClick={toggle}
      aria-label={`Cambiar a tema ${theme === 'light' ? 'oscuro' : 'claro'}`}
      className={`btn-icon ${className}`}
    >
      <Icon size={18} strokeWidth={1.75} />
    </button>
  )
}

export function Layout() {
  const { session } = useAuth()
  const location = useLocation()
  const signOut = () => supabase.auth.signOut()
  const email = session?.user.email ?? ''
  const [preference, setPreference] = useState(readPreference)
  const narrow = useNarrow()
  const collapsed = preference ? preference === 'collapsed' : narrow
  useGenerateRecurring()

  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [location.pathname])

  const toggleRail = () => {
    const next: RailPreference = collapsed ? 'expanded' : 'collapsed'
    setPreference(next)
    try {
      localStorage.setItem(RAIL_KEY, next)
    } catch {
      return
    }
  }

  return (
    <div className="min-h-screen md:flex">
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-border bg-bg/90 px-4 backdrop-blur md:hidden">
        <Logo />
        <div className="flex items-center gap-1">
          <ThemeButton />
          <ColorMenu placement="bottom" />
          <button
            onClick={signOut}
            aria-label="Cerrar sesión"
            className="btn-icon hover:text-expense"
          >
            <LogOut size={18} strokeWidth={1.75} />
          </button>
        </div>
      </header>

      <div
        className={`sticky top-0 z-30 hidden h-screen shrink-0 transition-[width] duration-300 ease-out md:block ${
          collapsed ? 'w-[4.5rem]' : 'w-64'
        }`}
      >
        <button
          onClick={toggleRail}
          aria-expanded={!collapsed}
          aria-label={collapsed ? 'Expandir menú lateral' : 'Contraer menú lateral'}
          title={collapsed ? 'Expandir menú' : 'Contraer menú'}
          className="absolute right-0 top-7 z-10 flex h-10 w-10 translate-x-1/2 items-center justify-center rounded-full border border-border bg-surface text-muted shadow-float transition-[color,transform,border-color] duration-200 ease-out hover:border-accent/60 hover:text-text active:scale-90"
        >
          <ChevronLeft
            size={20}
            strokeWidth={2}
            className={`transition-transform duration-300 ease-out ${collapsed ? 'rotate-180' : ''}`}
          />
        </button>

        <aside className="flex h-full w-full flex-col overflow-hidden bg-rail px-3 py-6 text-rail-text">
          <Logo className="px-2 text-rail-text" compact={collapsed} />

          <nav className="mt-10 flex flex-col gap-1" aria-label="Secciones">
            {sections.map((section) => (
              <RailLink key={section.to} {...section} collapsed={collapsed} />
            ))}
          </nav>

          <div className="mt-auto space-y-3 border-t border-white/10 pt-4">
            <div className="flex items-center gap-3 px-[7px]">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-sm font-semibold uppercase text-rail-accent">
                {email.charAt(0)}
              </span>
              <p
                className={`min-w-0 truncate text-xs text-rail-muted ${labelClass(collapsed)}`}
                title={email}
              >
                {email}
              </p>
            </div>

            <div className={`flex gap-1 ${collapsed ? 'flex-col items-center' : 'items-center'}`}>
              <ThemeButton className="text-rail-muted hover:bg-white/10 hover:text-rail-text" />
              <ColorMenu
                placement="right"
                className="text-rail-muted hover:bg-white/10 hover:text-rail-text"
              />
              <button
                onClick={signOut}
                aria-label="Cerrar sesión"
                title={collapsed ? 'Cerrar sesión' : undefined}
                className={`btn-icon gap-2 text-sm text-rail-muted hover:bg-white/10 hover:text-rail-text ${
                  collapsed ? '' : 'w-auto flex-1 justify-start px-3'
                }`}
              >
                <LogOut size={collapsed ? 18 : 16} strokeWidth={1.75} className="shrink-0" />
                <span className={labelClass(collapsed)}>Cerrar sesión</span>
              </button>
            </div>
          </div>
        </aside>
      </div>

      <main className="min-w-0 flex-1">
        <div
          className={`mx-auto px-4 pb-32 pt-6 transition-[max-width] duration-300 ease-out md:px-10 md:pb-14 md:pt-10 ${
            collapsed ? 'max-w-6xl' : 'max-w-5xl'
          }`}
        >
          <Suspense fallback={<PageSkeleton />}>
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, transition: { duration: 0.08 } }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              >
                <Outlet />
              </motion.div>
            </AnimatePresence>
          </Suspense>
        </div>
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        {sections.map((section) => (
          <TabLink key={section.to} {...section} />
        ))}
      </nav>
    </div>
  )
}
