import { useId, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronDown, type LucideIcon } from 'lucide-react'

type Props = { title: string; description?: string; icon: LucideIcon; children: ReactNode }

export function Disclosure({ title, description, icon: Icon, children }: Props) {
  const [open, setOpen] = useState(false)
  const id = useId()

  return (
    <section className="card">
      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-controls={id}
        className="flex w-full items-center gap-3.5 rounded-2xl p-5 text-left"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
          <Icon size={18} strokeWidth={1.75} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-medium">{title}</span>
          {description && <span className="block text-sm text-muted">{description}</span>}
        </span>
        <ChevronDown
          size={18}
          className={`shrink-0 text-muted transition-transform duration-300 ease-out ${open ? 'rotate-180' : ''}`}
        />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={id}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="border-t border-border p-5">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}
