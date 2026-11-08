import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

type Props = { icon: LucideIcon; title: string; text?: string; action?: ReactNode }

export function EmptyState({ icon: Icon, title, text, action }: Props) {
  return (
    <div className="flex animate-slide-in flex-col items-center gap-3 rounded-2xl border border-dashed border-border px-6 py-12 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-accent/10 text-accent">
        <Icon size={22} strokeWidth={1.75} />
      </span>
      <div className="space-y-1">
        <p className="font-medium">{title}</p>
        {text && <p className="mx-auto max-w-sm text-sm text-muted">{text}</p>}
      </div>
      {action}
    </div>
  )
}
