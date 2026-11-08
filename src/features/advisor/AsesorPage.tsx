import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { SendHorizontal, ShieldCheck, Sparkles, TriangleAlert, type LucideIcon } from 'lucide-react'
import { PageHeader } from '../../components/PageHeader'
import { Portal } from '../../components/Portal'
import { aiEnabled } from '../../lib/features'
import { useUpdateProfile } from '../plan/api'
import { usePlan } from '../plan/usePlan'
import { useCategories } from '../transactions/api'
import { DAILY_LIMIT, LimitReached, useAdvisorUsage, useAskAdvisor, type Turn } from './api'
import { buildContext } from './context'
import { articles, routeMessage } from './router'
import { userTerms } from './topic'

type Message = {
  id: number
  role: 'user' | 'assistant'
  text: string
  title?: string
  offer?: string
}

type Stored = { messages: Message[]; rejections: number }

const STORAGE_KEY = 'cyb-advisor'
const REJECTION_WARNING = 20
const REJECTION_LIMIT = 30

const WELCOME: Message = {
  id: 0,
  role: 'assistant',
  text: aiEnabled
    ? 'Hola, soy tu asesor de deudas. Puedo explicarte conceptos como el CAT, el pago mínimo o los métodos avalancha y bola de nieve. Si necesitas consejo sobre tu caso, puedo consultar tu plan con IA.'
    : 'Hola, soy tu asesor de deudas. Puedo explicarte conceptos como el CAT, el pago mínimo o los métodos avalancha y bola de nieve. Para saber cuánto abonar a cada deuda, revisa la pestaña Plan.',
}

const OFF_TOPIC =
  'Eso no tiene que ver con tu plan ni con tu método para atacar deudas. Pregúntame sobre tus deudas, gastos, ingresos o tu plan de pago.'

let rejectionCount = 0

const load = (): Stored => {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (raw) return { messages: (JSON.parse(raw) as Stored).messages, rejections: rejectionCount }
  } catch {
    return { messages: [WELCOME], rejections: rejectionCount }
  }
  return { messages: [WELCOME], rejections: rejectionCount }
}

function Dialog({
  title,
  icon: Icon,
  children,
}: {
  title: string
  icon: LucideIcon
  children: ReactNode
}) {
  return (
    <Portal>
      <div className="overlay" role="dialog" aria-modal="true" aria-label={title}>
        <div className="sheet max-w-md">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-accent/10 text-accent">
            <Icon size={20} strokeWidth={1.75} />
          </span>
          <h2 className="text-lg font-semibold">{title}</h2>
          {children}
        </div>
      </div>
    </Portal>
  )
}

function Avatar() {
  return (
    <span className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent">
      <Sparkles size={16} strokeWidth={1.75} />
    </span>
  )
}

export default function AsesorPage() {
  const { planDebts, capacity, result, profile, debts } = usePlan()
  const categories = useCategories()
  const usage = useAdvisorUsage()
  const ask = useAskAdvisor()
  const updateProfile = useUpdateProfile()

  const [stored, setStored] = useState<Stored>(load)
  const [input, setInput] = useState('')
  const [warning, setWarning] = useState(false)
  const [pendingConsent, setPendingConsent] = useState<string | null>(null)
  const endRef = useRef<HTMLDivElement>(null)

  const { messages, rejections } = stored
  const locked = rejections >= REJECTION_LIMIT
  const used = usage.data ?? 0
  const remaining = Math.max(DAILY_LIMIT - used, 0)

  const terms = useMemo(
    () =>
      userTerms([
        ...planDebts.map((debt) => debt.alias),
        ...(categories.data ?? []).map((category) => category.name),
      ]),
    [planDebts, categories.data],
  )

  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(stored))
    } catch {
      return
    }
  }, [stored])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages.length, ask.isPending])

  const push = (...added: Omit<Message, 'id'>[]) =>
    setStored((current) => {
      const base = current.messages.at(-1)?.id ?? 0
      return {
        ...current,
        messages: [
          ...current.messages,
          ...added.map((message, index) => ({ ...message, id: base + index + 1 })),
        ],
      }
    })

  const clearOffers = () =>
    setStored((current) => ({
      ...current,
      messages: current.messages.map((message) => ({ ...message, offer: undefined })),
    }))

  const send = (text: string) => {
    const clean = text.trim()
    if (!clean || locked) return
    const user = { role: 'user' as const, text: clean }
    const route = routeMessage(clean, terms)

    if (route.kind === 'greeting') {
      push(user, {
        role: 'assistant',
        text: 'Hola. Pregúntame sobre tus deudas, el CAT, el pago mínimo o tu plan de pago.',
      })
    } else if (route.kind === 'offtopic') {
      const count = rejections + 1
      rejectionCount = count
      setStored((current) => ({ ...current, rejections: count }))
      push(user, { role: 'assistant', text: OFF_TOPIC })
      if (count === REJECTION_WARNING) setWarning(true)
    } else if (route.kind === 'kb') {
      push(user, { role: 'assistant', title: route.article.title, text: route.article.answer })
    } else if (!aiEnabled) {
      push(user, {
        role: 'assistant',
        text: 'Esa pregunta es sobre tu caso y requiere el asesor con IA, que todavía no está disponible. Mientras tanto, la pestaña Plan ya calcula cuánto abonar a cada deuda según el método que elegiste.',
      })
    } else if (planDebts.length === 0) {
      push(user, {
        role: 'assistant',
        text: 'Para aconsejarte sobre tu caso necesito que registres al menos una deuda en Bills.',
      })
    } else if (remaining <= 0) {
      push(user, {
        role: 'assistant',
        text: `Ya usaste tus ${DAILY_LIMIT} mensajes de IA de hoy. Mañana se renuevan, y mientras tanto puedes preguntarme conceptos.`,
      })
    } else {
      push(user, {
        role: 'assistant',
        text: `Esa pregunta parece sobre tu caso. Puedo consultar tu plan personalizado con IA. Esto usa 1 de tus ${remaining} mensajes de hoy. ¿Lo hago?`,
        offer: clean,
      })
    }
  }

  const submit = (event: FormEvent) => {
    event.preventDefault()
    send(input)
    setInput('')
  }

  const showFaq = (title: string, answer: string) =>
    push({ role: 'user', text: title }, { role: 'assistant', title, text: answer })

  const consult = (question: string) => {
    if (!result || !capacity || !profile.data) return
    const typeById = new Map((debts.data ?? []).map((debt) => [debt.id, debt.type as string]))
    const history: Turn[] = messages
      .filter((message) => message.id !== 0)
      .slice(-7, -1)
      .map((message) => ({ role: message.role, text: message.text.slice(0, 800) }))

    ask.mutate(
      {
        message: question,
        history,
        context: buildContext(result, capacity, profile.data.method, typeById),
      },
      {
        onSuccess: (data) => push({ role: 'assistant', text: data.reply }),
        onError: (error) =>
          push({
            role: 'assistant',
            text:
              error instanceof LimitReached
                ? `Alcanzaste tus ${DAILY_LIMIT} mensajes de IA de hoy. Puedes seguir usando las respuestas de conceptos.`
                : error.message,
          }),
      },
    )
  }

  const accept = (question: string) => {
    clearOffers()
    if (profile.data?.ai_consent) consult(question)
    else setPendingConsent(question)
  }

  const grantConsent = () => {
    const question = pendingConsent
    setPendingConsent(null)
    if (!question) return
    updateProfile.mutate({ ai_consent: true }, { onSuccess: () => consult(question) })
  }

  const lastId = messages.at(-1)?.id

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-13rem)] max-w-2xl flex-col gap-6 md:min-h-[calc(100dvh-6rem)]">
      <PageHeader
        title="Asesor"
        actions={
          aiEnabled && (
            <p className="rounded-full border border-border bg-surface px-3 py-1 text-xs text-muted">
              Mensajes de IA hoy:{' '}
              <span className="num font-medium text-text">
                {used}/{DAILY_LIMIT}
              </span>
            </p>
          )
        }
      />

      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:overflow-visible md:px-0">
        {articles.slice(0, 6).map((article) => (
          <button
            key={article.id}
            onClick={() => showFaq(article.title, article.answer)}
            disabled={locked}
            className="chip shrink-0"
          >
            {article.title}
          </button>
        ))}
      </div>

      <div className="flex-1 space-y-4" aria-live="polite">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex animate-slide-in gap-3 ${message.role === 'user' ? 'justify-end' : ''}`}
          >
            {message.role === 'assistant' && <Avatar />}
            <div
              className={`max-w-[88%] space-y-2.5 px-4 py-3 text-sm leading-relaxed ${
                message.role === 'user'
                  ? 'rounded-2xl rounded-br-md bg-accent text-on-accent shadow-card'
                  : 'card rounded-tl-md'
              }`}
            >
              {message.title && <p className="font-semibold text-accent">{message.title}</p>}
              <p className="whitespace-pre-line">{message.text}</p>
              {message.offer && message.id === lastId && (
                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    onClick={() => accept(message.offer as string)}
                    disabled={ask.isPending}
                    className="btn btn-primary px-3.5 py-2"
                  >
                    Consultar mi plan
                  </button>
                  <button onClick={clearOffers} className="btn btn-secondary px-3.5 py-2">
                    No, gracias
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
        {ask.isPending && (
          <div
            className="flex animate-slide-in gap-3"
            role="status"
            aria-label="Consultando tu plan"
          >
            <Avatar />
            <div className="card flex items-center gap-1.5 rounded-tl-md px-4 py-4">
              {[0, 150, 300].map((delay) => (
                <span
                  key={delay}
                  className="h-2 w-2 animate-bounce rounded-full bg-muted"
                  style={{ animationDelay: `${delay}ms` }}
                />
              ))}
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div className="sticky bottom-[4.75rem] z-30 -mx-4 space-y-2 bg-bg/90 px-4 pb-3 pt-3 backdrop-blur md:bottom-0 md:mx-0 md:px-0">
        <form onSubmit={submit} className="flex gap-2">
          <input
            aria-label="Tu pregunta al asesor"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            disabled={locked}
            maxLength={500}
            placeholder={locked ? 'Asesor bloqueado por esta sesión' : 'Escribe tu pregunta…'}
            className="input rounded-full px-5 disabled:opacity-60"
          />
          <button
            disabled={locked || !input.trim()}
            aria-label="Enviar pregunta"
            className="btn btn-primary h-[2.75rem] w-[2.75rem] shrink-0 rounded-full p-0"
          >
            <SendHorizontal size={18} strokeWidth={1.75} />
          </button>
        </form>
        {locked && (
          <p className="text-center text-sm text-muted">
            Llegaste al límite de preguntas fuera de tema. Recarga la página para continuar.
          </p>
        )}
        <p className="text-center text-xs text-muted">
          Orientación informativa, no asesoría financiera profesional.
        </p>
      </div>

      {warning && (
        <Dialog title="Pregunta sobre tu plan" icon={TriangleAlert}>
          <p className="text-sm text-muted">
            Te quedan {REJECTION_LIMIT - rejections} intentos más de preguntar cosas que no van
            relacionadas con tu plan o tus deudas. Después se bloqueará el asesor.
          </p>
          <div className="flex justify-end">
            <button onClick={() => setWarning(false)} className="btn btn-primary">
              Entendido
            </button>
          </div>
        </Dialog>
      )}

      {pendingConsent && (
        <Dialog title="Antes de usar la IA" icon={ShieldCheck}>
          <p className="text-sm text-muted">
            Para aconsejarte, enviaré a Claude (Anthropic) solo cifras de tu plan: tipo de deuda,
            saldos, pagos mínimos, tasas y tus ingresos y gastos esenciales agregados. Las deudas se
            envían como “Deuda 1”, “Deuda 2”, sin nombres. No envío tu correo ni datos de contacto,
            y no guardo el historial de este chat en nuestros servidores.
          </p>
          <div className="flex justify-end gap-2">
            <button onClick={() => setPendingConsent(null)} className="btn btn-secondary">
              Cancelar
            </button>
            <button onClick={grantConsent} className="btn btn-primary">
              Acepto y continúo
            </button>
          </div>
        </Dialog>
      )}
    </div>
  )
}
