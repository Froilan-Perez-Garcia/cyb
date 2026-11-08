import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'

type Props = {
  icon: LucideIcon
  title: string
  description?: string
  danger?: boolean
  children: ReactNode
}

export function SettingsSection({ icon: Icon, title, description, danger, children }: Props) {
  return (
    <section
      className={`card animate-slide-in space-y-5 p-5 md:p-6 ${danger ? 'border-expense/30' : ''}`}
    >
      <div className="flex items-start gap-3.5">
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
            danger ? 'bg-expense/10 text-expense' : 'bg-accent/10 text-accent'
          }`}
        >
          <Icon size={18} strokeWidth={1.75} />
        </span>
        <div className="min-w-0">
          <h2 className={`font-semibold ${danger ? 'text-expense' : ''}`}>{title}</h2>
          {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
        </div>
      </div>
      {children}
    </section>
  )
}
