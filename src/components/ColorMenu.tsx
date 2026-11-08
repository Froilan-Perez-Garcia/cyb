import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { Palette } from 'lucide-react'
import { AccentSwatches } from './AccentSwatches'

type Placement = 'top' | 'right' | 'bottom'

const PANEL_WIDTH = 270
const MARGIN = 12

const position = (rect: DOMRect, placement: Placement): CSSProperties => {
  const left = Math.max(MARGIN, Math.min(rect.left, window.innerWidth - PANEL_WIDTH - MARGIN))
  if (placement === 'top') return { left, bottom: window.innerHeight - rect.top + 8 }
  if (placement === 'right') return { left: rect.right + 12, bottom: window.innerHeight - rect.bottom }
  return { right: Math.max(MARGIN, window.innerWidth - rect.right), top: rect.bottom + 8 }
}

export function ColorMenu({
  placement,
  className = '',
}: {
  placement: Placement
  className?: string
}) {
  const [style, setStyle] = useState<CSSProperties | null>(null)
  const root = useRef<HTMLDivElement>(null)
  const open = style !== null

  useEffect(() => {
    if (!open) return
    const close = () => setStyle(null)
    const onPointer = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) close()
    }
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && close()
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    window.addEventListener('resize', close)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('resize', close)
    }
  }, [open])

  const toggle = (button: HTMLButtonElement) =>
    setStyle(open ? null : position(button.getBoundingClientRect(), placement))

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        onClick={(event) => toggle(event.currentTarget)}
        aria-expanded={open}
        aria-label="Cambiar color principal"
        title="Color principal"
        className={`btn-icon ${open ? 'bg-raised text-text' : ''} ${className}`}
      >
        <Palette size={18} strokeWidth={1.75} />
      </button>
      {open && (
        <div
          style={style}
          className="fixed z-50 animate-pop-in rounded-2xl border border-border bg-surface p-3.5 text-text shadow-float"
        >
          <AccentSwatches className="grid grid-cols-6 gap-2.5 [&>*]:h-8 [&>*]:w-8" />
        </div>
      )}
    </div>
  )
}
