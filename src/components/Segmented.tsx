import { motion } from 'framer-motion'

type Option<T extends string> = { id: T; label: string }

type Props<T extends string> = {
  name: string
  label: string
  options: Option<T>[]
  value: T
  onChange: (value: T) => void
  className?: string
}

export function Segmented<T extends string>({
  name,
  label,
  options,
  value,
  onChange,
  className = '',
}: Props<T>) {
  return (
    <div role="group" aria-label={label} className={`seg auto-cols-fr grid-flow-col ${className}`}>
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          aria-pressed={value === option.id}
          onClick={() => onChange(option.id)}
          className="seg-item"
        >
          {value === option.id && (
            <motion.span
              layoutId={`seg-${name}`}
              transition={{ type: 'spring', stiffness: 520, damping: 40 }}
              className="absolute inset-0 rounded-lg bg-surface shadow-card"
            />
          )}
          <span className="relative z-10">{option.label}</span>
        </button>
      ))}
    </div>
  )
}
