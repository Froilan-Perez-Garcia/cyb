import type { ReactNode } from 'react'

type Props = { title: string; description?: string; actions?: ReactNode }

export function PageHeader({ title, description, actions }: Props) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold md:text-3xl">{title}</h1>
        {description && <p className="mt-1 max-w-prose text-sm text-muted">{description}</p>}
      </div>
      {actions}
    </header>
  )
}
