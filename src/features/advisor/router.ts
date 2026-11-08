import Fuse from 'fuse.js'
import knowledge from './knowledge.json'
import { normalize, tokenize } from './text'
import { isGreeting, isOnTopic } from './topic'

export type Article = { id: string; title: string; keywords: string[]; answer: string }

export type Route =
  | { kind: 'greeting' }
  | { kind: 'offtopic' }
  | { kind: 'kb'; article: Article }
  | { kind: 'personal' }

export const articles = knowledge as Article[]

const stopwords = new Set([
  'deuda',
  'deudas',
  'conviene',
  'atacar',
  'primero',
  'mes',
  'este',
  'que',
  'como',
  'cual',
  'cuales',
  'cuanto',
  'cuando',
  'donde',
  'por',
  'para',
  'con',
  'sin',
  'una',
  'uno',
  'unos',
  'unas',
  'del',
  'los',
  'las',
  'mis',
  'sus',
  'esta',
  'este',
  'eso',
  'esa',
  'ese',
  'son',
  'hay',
  'puedo',
  'debo',
  'quiero',
  'tengo',
  'hacer',
  'sobre',
  'pero',
  'mas',
  'muy',
  'me',
  'mi',
  'es',
  'el',
  'la',
  'de',
  'en',
  'un',
  'y',
  'a',
  'o',
  'se',
])

const CONFIDENCE = 0.75

const fuse = new Fuse(
  articles.map((article) => ({
    id: article.id,
    keywords: article.keywords.map(normalize),
    title: normalize(article.title),
  })),
  {
    keys: [
      { name: 'keywords', weight: 2 },
      { name: 'title', weight: 1 },
    ],
    threshold: 0.25,
    includeScore: true,
    ignoreLocation: true,
  },
)

export function searchKnowledge(message: string): Article | null {
  const tally = new Map<string, number>()
  const phrase = normalize(message)

  for (const article of articles) {
    if (
      article.keywords.some(
        (keyword) => keyword.includes(' ') && phrase.includes(normalize(keyword)),
      )
    ) {
      tally.set(article.id, (tally.get(article.id) ?? 0) + 1)
    }
  }

  for (const token of tokenize(message)) {
    if (token.length < 3 || stopwords.has(token)) continue
    for (const hit of fuse.search(token)) {
      const weight = 1 - (hit.score ?? 1)
      tally.set(hit.item.id, (tally.get(hit.item.id) ?? 0) + weight)
    }
  }

  let bestId: string | null = null
  let best = 0
  for (const [id, score] of tally) {
    if (score > best) {
      best = score
      bestId = id
    }
  }

  if (!bestId || best < CONFIDENCE) return null
  return articles.find((article) => article.id === bestId) ?? null
}

export function routeMessage(message: string, personalTerms: string[]): Route {
  if (isGreeting(message)) return { kind: 'greeting' }
  if (!isOnTopic(message, personalTerms)) return { kind: 'offtopic' }
  const article = searchKnowledge(message)
  return article ? { kind: 'kb', article } : { kind: 'personal' }
}
