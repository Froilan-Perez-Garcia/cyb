import type { ReactNode } from 'react'
import { Logo } from './Logo'

const bars = [
  { width: '100%', delay: '120ms', tone: 'bg-rail-accent' },
  { width: '68%', delay: '260ms', tone: 'bg-rail-accent/70' },
  { width: '36%', delay: '400ms', tone: 'bg-rail-accent/45' },
]

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      <aside className="relative hidden overflow-hidden bg-rail p-12 text-rail-text lg:flex lg:flex-col">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_55%_at_15%_105%,rgb(var(--accent)/0.28),transparent)]" />
        <Logo className="relative" />
        <div className="relative mt-auto max-w-md space-y-8">
          <div className="space-y-2.5" aria-hidden="true">
            {bars.map((bar) => (
              <div
                key={bar.width}
                className={`h-2.5 origin-left animate-grow rounded-full ${bar.tone}`}
                style={{ width: bar.width, animationDelay: bar.delay }}
              />
            ))}
          </div>
          <div className="space-y-3">
            <h2 className="text-4xl font-semibold leading-[1.1]">Check your bills</h2>
            <p className="text-rail-muted">
              Registra tus gastos, ingresos y deudas, y decide cuál atacar primero.
            </p>
          </div>
        </div>
      </aside>

      <main className="flex items-center justify-center px-5 py-10">
        <div className="w-full max-w-sm animate-slide-in">
          <Logo className="mb-10 lg:hidden" />
          {children}
        </div>
      </main>
    </div>
  )
}
