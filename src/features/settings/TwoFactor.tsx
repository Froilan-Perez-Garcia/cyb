import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { supabase } from '../../lib/supabase'
import { verifyCode } from './mfa'

type Enrollment = { factorId: string; qr: string; secret: string }

const useFactors = () =>
  useQuery({
    queryKey: ['mfa-factors'],
    queryFn: async () => {
      const { data, error } = await supabase.auth.mfa.listFactors()
      if (error) throw error
      return data
    },
  })

export function TwoFactor() {
  const client = useQueryClient()
  const factors = useFactors()
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null)
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [confirmingOff, setConfirmingOff] = useState(false)

  const refresh = () => client.invalidateQueries({ queryKey: ['mfa-factors'] })

  const start = useMutation({
    mutationFn: async () => {
      const pending = factors.data?.all.filter((factor) => factor.status === 'unverified') ?? []
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
      if (!enrollment) return
      await verifyCode(enrollment.factorId, code.trim())
    },
    onSuccess: () => {
      setEnrollment(null)
      setCode('')
      refresh()
    },
    onError: () => {
      setError('Código incorrecto. Revisa que la hora de tu teléfono sea automática.')
      setCode('')
    },
  })

  const disable = useMutation({
    mutationFn: async (factorId: string) => {
      const { error: removeError } = await supabase.auth.mfa.unenroll({ factorId })
      if (removeError) throw removeError
    },
    onSuccess: () => {
      setConfirmingOff(false)
      refresh()
    },
    onError: (caught: Error) => {
      setConfirmingOff(false)
      setError(caught.message)
    },
  })

  const cancel = async () => {
    if (enrollment) await supabase.auth.mfa.unenroll({ factorId: enrollment.factorId })
    setEnrollment(null)
    setCode('')
    setError('')
    refresh()
  }

  const submit = (event: FormEvent) => {
    event.preventDefault()
    confirm.mutate()
  }

  const active = factors.data?.totp[0]

  return (
    <section className="space-y-3 rounded-2xl border border-border bg-surface p-4">
      <div>
        <h2 className="font-semibold">Verificación en dos pasos</h2>
        <p className="text-sm text-muted">
          Pide un código de tu app de autenticación (Google Authenticator, Authy, 1Password…) al
          iniciar sesión.
        </p>
      </div>

      {factors.isPending ? (
        <p className="text-sm text-muted">Cargando…</p>
      ) : enrollment ? (
        <form onSubmit={submit} className="space-y-3">
          <p className="text-sm">
            1. Escanea este código QR con tu app. 2. Escribe el código de 6 dígitos que te muestre.
          </p>
          <img
            src={enrollment.qr}
            alt="Código QR para tu app de autenticación"
            className="mx-auto h-44 w-44 rounded-lg bg-white p-2"
          />
          <p className="break-all text-center text-xs text-muted">
            ¿No puedes escanear? Escribe esta clave:{' '}
            <span className="font-mono">{enrollment.secret}</span>
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
            className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-center text-xl tracking-[0.4em] outline-none focus:border-accent"
          />
          <div className="flex gap-2">
            <button
              disabled={confirm.isPending || code.length !== 6}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-bg disabled:opacity-60"
            >
              Activar
            </button>
            <button
              type="button"
              onClick={cancel}
              className="rounded-lg border border-border px-4 py-2 text-sm text-muted hover:text-text"
            >
              Cancelar
            </button>
          </div>
        </form>
      ) : active ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-medium text-income">Activada</p>
          <button
            onClick={() => setConfirmingOff(true)}
            className="rounded-lg border border-border px-4 py-2 text-sm text-muted hover:text-expense"
          >
            Desactivar
          </button>
        </div>
      ) : (
        <button
          onClick={() => start.mutate()}
          disabled={start.isPending}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-bg disabled:opacity-60"
        >
          Activar verificación en dos pasos
        </button>
      )}

      {error && <p className="text-sm text-expense">{error}</p>}

      {confirmingOff && active && (
        <ConfirmDialog
          title="¿Desactivar la verificación en dos pasos?"
          message="Tu cuenta quedará protegida solo con tu contraseña."
          confirmLabel="Desactivar"
          busy={disable.isPending}
          onCancel={() => setConfirmingOff(false)}
          onConfirm={() => disable.mutate(active.id)}
        />
      )}
    </section>
  )
}
