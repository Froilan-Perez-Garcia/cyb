import { useState, type FormEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, LoaderCircle, Sparkles } from 'lucide-react'
import { Portal } from '../../components/Portal'
import { setDebtsModule } from '../../lib/modules'
import { supabase } from '../../lib/supabase'
import { useCategories } from './api'
import { toIso } from './period'
import { frequencies, frequencyLabels } from './recurringApi'

const KEY = 'cyb-setup'

const fixedExpenses = [
  { name: 'Renta', category: 'Renta' },
  { name: 'Luz', category: 'Servicios' },
  { name: 'Agua', category: 'Servicios' },
  { name: 'Internet', category: 'Servicios' },
  { name: 'Celular', category: 'Servicios' },
  { name: 'Suscripciones', category: 'Ocio' },
]

const nextOccurrence = (day: number) => {
  const now = new Date()
  const at = (offset: number) => {
    const last = new Date(now.getFullYear(), now.getMonth() + offset + 1, 0).getDate()
    return new Date(now.getFullYear(), now.getMonth() + offset, Math.min(day, last))
  }
  const thisMonth = at(0)
  return toIso(
    thisMonth >= new Date(now.getFullYear(), now.getMonth(), now.getDate()) ? thisMonth : at(1),
  )
}

const wasDismissed = () => {
  try {
    return localStorage.getItem(KEY) === 'done'
  } catch {
    return false
  }
}

const markDone = () => {
  try {
    localStorage.setItem(KEY, 'done')
  } catch {
    return
  }
}

export function SetupPrompt({ onStart }: { onStart: () => void }) {
  const [hidden, setHidden] = useState(wasDismissed)
  if (hidden) return null

  return (
    <section className="card flex animate-slide-in flex-wrap items-center gap-4 p-5">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent">
        <Sparkles size={20} strokeWidth={1.75} />
      </span>
      <div className="min-w-0 flex-1 basis-56">
        <p className="font-semibold">Configura tu mes en 1 minuto</p>
        <p className="text-sm text-muted">
          Dinos cuánto ganas y tus gastos fijos. Se registrarán solos cada vez que toquen.
        </p>
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => {
            markDone()
            setHidden(true)
          }}
          className="btn btn-quiet"
        >
          Ahora no
        </button>
        <button onClick={onStart} className="btn btn-primary">
          Empezar
        </button>
      </div>
    </section>
  )
}

export function SetupWizard({ onClose }: { onClose: () => void }) {
  const client = useQueryClient()
  const categories = useCategories()
  const [step, setStep] = useState(0)
  const [income, setIncome] = useState('')
  const [frequency, setFrequency] = useState<(typeof frequencies)[number]>('quincenal')
  const [incomeDate, setIncomeDate] = useState(toIso(new Date()))
  const [amounts, setAmounts] = useState<Record<string, string>>({})
  const [days, setDays] = useState<Record<string, string>>({})
  const [hasDebts, setHasDebts] = useState(false)
  const [error, setError] = useState('')

  const save = useMutation({
    mutationFn: async () => {
      const { data: auth } = await supabase.auth.getUser()
      const user_id = auth.user?.id
      const rows: Record<string, unknown>[] = []
      if (Number(income) > 0) {
        rows.push({
          user_id,
          kind: 'ingreso',
          concept: 'Sueldo',
          amount: Number(income),
          frequency,
          next_on: incomeDate,
          category_id: null,
        })
      }
      for (const item of fixedExpenses) {
        const amount = Number(amounts[item.name])
        if (!(amount > 0)) continue
        const day = Math.min(31, Math.max(1, Number(days[item.name]) || 1))
        rows.push({
          user_id,
          kind: 'gasto',
          concept: item.name,
          amount,
          frequency: 'mensual',
          next_on: nextOccurrence(day),
          category_id: categories.data?.find((c) => c.name === item.category)?.id ?? null,
        })
      }
      if (rows.length > 0) {
        const { error: insertError } = await supabase.from('recurring_items').insert(rows)
        if (insertError) throw insertError
        await supabase.rpc('generate_recurring')
      }
    },
    onSuccess: () => {
      if (hasDebts) setDebtsModule(true)
      markDone()
      client.invalidateQueries({ queryKey: ['recurring'] })
      client.invalidateQueries({ queryKey: ['transactions'] })
      onClose()
    },
    onError: (caught: Error) => setError(caught.message),
  })

  const next = (event: FormEvent) => {
    event.preventDefault()
    setError('')
    if (step < 2) setStep(step + 1)
    else save.mutate()
  }

  const titles = ['¿Cuánto ganas?', 'Tus gastos fijos', 'Último paso']

  return (
    <Portal>
      <div className="overlay" role="dialog" aria-modal="true" aria-label="Configuración inicial">
        <form onSubmit={next} className="sheet max-h-[90dvh] max-w-md space-y-5 overflow-y-auto">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted">Paso {step + 1} de 3</p>
            <h2 className="text-xl font-semibold">{titles[step]}</h2>
          </div>

          {step === 0 && (
            <div className="space-y-4">
              <label className="field-label">
                <span>
                  Monto de cada pago <span className="field-hint">(puedes dejarlo vacío)</span>
                </span>
                <input
                  value={income}
                  onChange={(event) => setIncome(event.target.value.replace(/[^\d.]/g, ''))}
                  inputMode="decimal"
                  autoFocus
                  placeholder="0"
                  className="input"
                />
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="field-label">
                  <span>Te pagan</span>
                  <select
                    value={frequency}
                    onChange={(event) => setFrequency(event.target.value as typeof frequency)}
                    className="input"
                  >
                    {frequencies.map((item) => (
                      <option key={item} value={item}>
                        {frequencyLabels[item]}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field-label">
                  <span>Próximo pago</span>
                  <input
                    type="date"
                    value={incomeDate}
                    onChange={(event) => setIncomeDate(event.target.value)}
                    className="input"
                  />
                </label>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-3">
              <p className="text-sm text-muted">
                Llena solo los que tengas, cada mes. Los demás los agregas con el botón +.
              </p>
              <ul className="space-y-2.5">
                {fixedExpenses.map((item) => (
                  <li key={item.name} className="flex items-center gap-2.5">
                    <span className="w-28 shrink-0 text-sm font-medium">{item.name}</span>
                    <input
                      value={amounts[item.name] ?? ''}
                      onChange={(event) =>
                        setAmounts({
                          ...amounts,
                          [item.name]: event.target.value.replace(/[^\d.]/g, ''),
                        })
                      }
                      inputMode="decimal"
                      placeholder="$ monto"
                      aria-label={`Monto de ${item.name}`}
                      className="input min-w-0 flex-1"
                    />
                    <input
                      value={days[item.name] ?? ''}
                      onChange={(event) =>
                        setDays({
                          ...days,
                          [item.name]: event.target.value.replace(/\D/g, '').slice(0, 2),
                        })
                      }
                      inputMode="numeric"
                      placeholder="día"
                      aria-label={`Día del mes de ${item.name}`}
                      className="input w-16 shrink-0 text-center"
                    />
                  </li>
                ))}
              </ul>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <p className="text-sm text-muted">
                Ya puedes registrar gastos con el botón + en un par de toques.
              </p>
              <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-border bg-raised/60 p-4 text-sm">
                <input
                  type="checkbox"
                  checked={hasDebts}
                  onChange={(event) => setHasDebts(event.target.checked)}
                  className="h-4 w-4 accent-[rgb(var(--accent))]"
                />
                Tengo tarjetas de crédito o deudas y quiero llevar su control
              </label>
            </div>
          )}

          {error && (
            <p
              role="alert"
              className="rounded-xl border border-expense/30 bg-expense/10 px-3.5 py-2.5 text-sm text-expense"
            >
              {error}
            </p>
          )}

          <div className="flex gap-2">
            {step > 0 ? (
              <button
                type="button"
                onClick={() => setStep(step - 1)}
                aria-label="Paso anterior"
                className="btn btn-secondary"
              >
                <ArrowLeft size={16} />
              </button>
            ) : (
              <button type="button" onClick={onClose} className="btn btn-secondary">
                Cancelar
              </button>
            )}
            <button disabled={save.isPending} className="btn btn-primary flex-1 py-3">
              {save.isPending && <LoaderCircle size={16} className="animate-spin" />}
              {step < 2 ? 'Siguiente' : 'Terminar'}
            </button>
          </div>
        </form>
      </div>
    </Portal>
  )
}
