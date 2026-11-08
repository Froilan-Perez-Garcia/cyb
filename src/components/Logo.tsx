export function LogoMark({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" className="shrink-0">
      <rect width="32" height="32" rx="9" fill="rgb(var(--accent))" />
      <rect x="9.5" y="6.5" width="13" height="19" rx="2.4" fill="rgb(var(--on-accent))" />
      <rect x="12" y="11" width="8" height="1.8" rx="0.9" fill="rgb(var(--accent))" />
      <rect x="12" y="15" width="8" height="1.8" rx="0.9" fill="rgb(var(--accent))" />
      <rect x="12" y="19" width="4.5" height="1.8" rx="0.9" fill="rgb(var(--accent))" />
    </svg>
  )
}

export function Logo({
  className = '',
  compact = false,
}: {
  className?: string
  compact?: boolean
}) {
  return (
    <span className={`inline-flex items-center ${className}`}>
      <LogoMark />
      <span
        className={`overflow-hidden whitespace-nowrap text-lg font-semibold tracking-tight transition-[max-width,opacity,margin] duration-300 ease-out ${
          compact ? 'ml-0 max-w-0 opacity-0' : 'ml-2.5 max-w-16 opacity-100'
        }`}
      >
        CYB
      </span>
    </span>
  )
}
