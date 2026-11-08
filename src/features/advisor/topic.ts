import { normalize, tokenize } from './text'

const stems = [
  'deud',
  'debo',
  'adeud',
  'tarjet',
  'credit',
  'prestam',
  'interes',
  'tasa',
  'pag',
  'abon',
  'gast',
  'ingres',
  'sueldo',
  'salari',
  'nomina',
  'quincen',
  'mensual',
  'presupuest',
  'ahorr',
  'plan',
  'avalanch',
  'nieve',
  'saldo',
  'minimo',
  'corte',
  'colchon',
  'emergen',
  'renta',
  'banco',
  'bancar',
  'dinero',
  'financ',
  'cobr',
  'liquid',
  'consolid',
  'refinanc',
  'reestructur',
  'bono',
  'aguinaldo',
  'metodo',
  'esencial',
  'hormiga',
  'efectivo',
  'mora',
  'anualidad',
  'comision',
  'cuota',
  'costo',
  'anual',
  'factur',
  'recib',
]

const phrases = ['estado de cuenta', 'cuenta de ahorro', 'tarjeta de debito']

const exactTokens = new Set(['cat', 'cyb', 'app', 'bbva', 'hsbc', 'nu', 'oxxo', 'bola'])

const greetingTokens = new Set([
  'hola',
  'buenas',
  'buenos',
  'dias',
  'tardes',
  'noches',
  'hey',
  'gracias',
  'ok',
  'okay',
  'adios',
  'que',
  'tal',
  'saludos',
])

export const isGreeting = (message: string) => {
  const tokens = tokenize(message)
  return tokens.length > 0 && tokens.length <= 5 && tokens.every((t) => greetingTokens.has(t))
}

export const userTerms = (labels: string[]) =>
  labels.flatMap((label) => tokenize(label)).filter((token) => token.length >= 3)

export function isOnTopic(message: string, personalTerms: string[]) {
  const tokens = tokenize(message)
  const text = normalize(message)
  if (phrases.some((phrase) => text.includes(phrase))) return true
  if (tokens.some((token) => exactTokens.has(token))) return true
  if (tokens.some((token) => stems.some((stem) => token.startsWith(stem)))) return true
  return personalTerms.some((term) => text.includes(term))
}
