import { useEffect, useRef } from 'react'
import { animate, useMotionValue, useReducedMotion } from 'framer-motion'
import { formatMoney } from '../lib/format'

export function AnimatedMoney({ value, className = '' }: { value: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const reduce = useReducedMotion()
  const progress = useMotionValue(reduce ? value : 0)
  const initial = useRef(formatMoney(reduce ? value : 0)).current

  useEffect(
    () =>
      progress.on('change', (next) => {
        if (ref.current) ref.current.textContent = formatMoney(next)
      }),
    [progress],
  )

  useEffect(() => {
    if (reduce) {
      progress.set(value)
      return
    }
    const controls = animate(progress, value, { duration: 0.9, ease: [0.16, 1, 0.3, 1] })
    return () => controls.stop()
  }, [value, reduce, progress])

  return (
    <span ref={ref} className={`num ${className}`}>
      {initial}
    </span>
  )
}
