import { useState, type FormEvent } from 'react'
import { useMutation } from '@tanstack/react-query'
import { LoaderCircle } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { verifyCode } from './mfa'

type Enrollment = { factorId: string; qr: string; secret: string }

export function TotpEnroll({ onDone, startLabel }: { onDone: () => void; startLabel: string }) {
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null)
  const [code, setCode] = useState('')
  const [error, setError] = useState('')

  const start = useMutation({
    mutationFn: async () => {
      const { data: listed } = await supabase.auth.mfa.listFactors()
      const pending = listed?.all.filter((factor) => factor.status === 'unverified') ?? []
      await Promise.all(
        pending.map((factor) => supabase.auth.mfa.unenroll({ factorId: factor.id })),
      )
      const { data, error: enrollError } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: `CYB ${new Date().toISOString()}`,
      })
      if (enrollError) throw enrollError
      return { factorId: data.id, qr: data.totp.qr_code, secret: data.totp.secret }
    },
    onSuccess: (data) => {
      setError('')
      setCode('')
      setEnrollment(data)
    },
    onError: (caught: Error) => setError(caught.message),
  })

  const confirm = useMutation({
    mutationFn: async () => {
      if (enrollment) await verifyCode(enrollment.factorId, code.trim())
    },
    onSuccess: onDone,
    onError: () => {
      setError('Código incorrecto. Revisa que la hora de tu teléfono sea automática.')
      setCode('')
    },
  })

  const submit = (event: FormEvent) => {
    event.preventDefault()
    confirm.mutate()
  }

  return (
    <div className="space-y-4">
      {enrollment ? (
        <form onSubmit={submit} className="animate-slide-in space-y-5">
          <ol className="space-y-1 text-sm text-muted">
            <li>1. Escanea este código QR con tu app.</li>
            <li>2. Escribe el código de 6 dígitos que te muestre.</li>
          </ol>
          <img
            src={enrollment.qr}
            alt="Código QR para tu app de autenticación"
            className="mx-auto h-44 w-44 rounded-xl bg-white p-2.5 shadow-card"
          />
          <p className="break-all text-center text-xs text-muted">
            ¿No puedes escanear? Escribe esta clave:{' '}
            <span className="font-mono text-text">{enrollment.secret}</span>
          </p>
          <input
            value={code}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
            aria-label="Código de 6 dígitos"
            inputMode="numeric"
            autoComplete="one-time-code"
            required
            minLength={6}
            maxLength={6}
            className="input py-3.5 text-center text-2xl font-semibold tracking-[0.5em]"
          />
          <button
            disabled={confirm.isPending || code.length !== 6}
            className="btn btn-primary w-full py-3"
          >
            {confirm.isPending && <LoaderCircle size={16} className="animate-spin" />}
            Activar
          </button>
        </form>
      ) : (
        <button
          onClick={() => start.mutate()}
          disabled={start.isPending}
          className="btn btn-primary w-full py-3"
        >
          {start.isPending && <LoaderCircle size={16} className="animate-spin" />}
          {startLabel}
        </button>
      )}

      {error && (
        <p role="alert" className="text-sm text-expense">
          {error}
        </p>
      )}
    </div>
  )
}
