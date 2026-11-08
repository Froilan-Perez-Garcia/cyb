import { useEffect, useRef, useState } from 'react'
import { Smartphone } from 'lucide-react'
import { createParticleField } from '../lib/particleField'

type MotionPermission = { requestPermission?: () => Promise<'granted' | 'denied'> }

const clamp = (value: number) => Math.max(-1, Math.min(1, value))

export default function ParticleBackdrop() {
  const hostRef = useRef<HTMLDivElement>(null)
  const enableMotion = useRef<() => void>(() => undefined)
  const [ready, setReady] = useState(false)
  const [needsPermission, setNeedsPermission] = useState(false)

  useEffect(() => {
    const host = hostRef.current
    if (!host || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const canvas = document.createElement('canvas')
    canvas.className = 'block h-full w-full'
    host.appendChild(canvas)

    const mobile = window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 768
    let field: ReturnType<typeof createParticleField>
    try {
      field = createParticleField(canvas, { mobile })
    } catch {
      canvas.remove()
      return
    }
    setReady(true)

    let base: { beta: number; gamma: number } | null = null
    const onOrientation = (event: DeviceOrientationEvent) => {
      if (event.beta === null || event.gamma === null) return
      base ??= { beta: event.beta, gamma: event.gamma }
      field.tilt(clamp((event.gamma - base.gamma) / 25), clamp((event.beta - base.beta) / 25))
    }
    const listen = () => window.addEventListener('deviceorientation', onOrientation)

    const onPointer = (event: PointerEvent) => field.pointer(event.clientX, event.clientY)
    const onResize = () => field.resize()
    window.addEventListener('pointermove', onPointer, { passive: true })
    window.addEventListener('resize', onResize)

    const motion = window.DeviceOrientationEvent as unknown as MotionPermission | undefined
    if (mobile && motion) {
      if (typeof motion.requestPermission === 'function') {
        setNeedsPermission(true)
        enableMotion.current = () => {
          motion.requestPermission?.().then((result) => {
            if (result !== 'granted') return
            listen()
            setNeedsPermission(false)
          })
        }
      } else {
        listen()
      }
    }

    return () => {
      window.removeEventListener('pointermove', onPointer)
      window.removeEventListener('resize', onResize)
      window.removeEventListener('deviceorientation', onOrientation)
      field.destroy()
      canvas.remove()
      setReady(false)
    }
  }, [])

  return (
    <>
      <div
        ref={hostRef}
        aria-hidden="true"
        className={`pointer-events-none fixed inset-0 transition-opacity duration-[1400ms] ease-out ${
          ready ? 'opacity-100' : 'opacity-0'
        }`}
      />
      {needsPermission && (
        <button
          onClick={() => enableMotion.current()}
          className="chip fixed right-4 top-4 z-20 gap-2 bg-surface/80 px-3.5 py-2 backdrop-blur"
        >
          <Smartphone size={14} strokeWidth={1.75} />
          Activar movimiento
        </button>
      )}
    </>
  )
}
