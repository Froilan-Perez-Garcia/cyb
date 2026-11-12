import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, ShieldCheck } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { SettingsSection } from './SettingsSection'
import { TotpEnroll } from './TotpEnroll'

export function TwoFactor() {
  const client = useQueryClient()
  const factors = useQuery({
    queryKey: ['mfa-factors'],
    queryFn: async () => {
      const { data, error } = await supabase.auth.mfa.listFactors()
      if (error) throw error
      return data
    },
  })

  return (
    <SettingsSection
      icon={ShieldCheck}
      title="Verificación en dos pasos"
      description="Obligatoria. Pide un código de tu app de autenticación (Google Authenticator, Authy, 1Password…) al iniciar sesión."
    >
      {factors.isPending ? (
        <p className="text-sm text-muted">Cargando…</p>
      ) : factors.data?.totp[0] ? (
        <p className="flex w-fit items-center gap-2 rounded-full bg-income/10 px-3 py-1.5 text-sm font-medium text-income">
          <Check size={16} strokeWidth={2.25} />
          Activada
        </p>
      ) : (
        <TotpEnroll
          startLabel="Activar verificación en dos pasos"
          onDone={() => client.invalidateQueries({ queryKey: ['mfa-factors'] })}
        />
      )}
    </SettingsSection>
  )
}
