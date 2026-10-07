import type { H3Event } from 'h3'
import sanitizeHtml from 'sanitize-html'
import type { Block, DjangoDashboard, DjangoProgress, DjangoTopic } from '#shared/types/learn'
import type { DjangoClip } from './django-hazard'

/*
 * The learning area runs on the Django backend's Learning API (/api/learn/*, as described in the backend's
 * "Learning API — Frontend Integration Guide"). Until Django has content, this app serves its own material so
 * the area is never empty. The switch is automatic: once /api/learn/topics/ returns at least one topic, every
 * learning page uses Django and shows only what its API offers.
 */

const CHECK_MS = 5 * 60_000
const RETRY_AFTER_MS = 1500
let decided: { at: number; django: boolean } | null = null

/** Whether the learning material should come from Django (checked every few minutes, with the visitor's session). */
export async function useDjangoLearning(event: H3Event): Promise<boolean> {
  if (decided && Date.now() - decided.at < CHECK_MS) return decided.django
  const user = await getSessionUser(event)
  if (!user) return decided?.django ?? false // can't ask without a session; keep the last answer
  try {
    const res = await djangoFetch<{ topics?: unknown[] }>(event, 'GET', '/api/learn/topics/', { auth: true })
    // A failed check (Render waking up, a 5xx) keeps the last answer, so the site doesn't flip to our material
    if (res.ok) decided = { at: Date.now(), django: (res.data.topics?.length ?? 0) > 0 }
    else decided = { at: Date.now(), django: decided?.django ?? false }
  } catch {
    decided = { at: Date.now(), django: decided?.django ?? false }
  }
  return decided.django
}

/**
 * The learning dashboard straight from Django — the guide's Flow A: GET /api/learn/topics/ + GET /api/learn/progress/.
 * Neither needs a plan; nothing is computed here beyond what Django sends.
 */
export async function djangoDashboard(event: H3Event): Promise<DjangoDashboard> {
  const [topics, progress, access] = await Promise.all([
    djangoFetch<{ topics?: DjangoTopic[] }>(event, 'GET', '/api/learn/topics/', { auth: true }),
    djangoFetch<DjangoProgress>(event, 'GET', '/api/learn/progress/', { auth: true }),
    hasAccess(event)
  ])
  if (topics.status === 401 || progress.status === 401) throw createError({ statusCode: 401, statusMessage: 'Please log in' })
  return {
    source: 'django',
    hasAccess: access,
    topics: topics.ok ? topics.data.topics ?? [] : [],
    progress: progress.ok ? progress.data : null
  }
}

/** Theory HTML written in the Django admin, reduced to safe formatting before it reaches the page. */
const cleanHtml = (html: string) =>
  sanitizeHtml(html, {
    allowedTags: [...sanitizeHtml.defaults.allowedTags, 'img', 'h2', 'h3', 'h4', 'figure', 'figcaption'],
    allowedAttributes: { a: ['href', 'title'], img: ['src', 'alt', 'width', 'height'], td: ['colspan', 'rowspan'], th: ['colspan', 'rowspan'] },
    allowedSchemes: ['https', 'mailto'],
    transformTags: { a: sanitizeHtml.simpleTransform('a', { rel: 'noopener noreferrer', target: '_blank' }) }
  })

const isHttps = (url: unknown) => typeof url === 'string' && /^https:\/\//i.test(url)

/** Block types the pages render; anything else from Django is dropped (the guide: ignore unknown types). */
const cleanBlocks = (blocks: Block[] = []): Block[] =>
  blocks.flatMap((b): Block[] => {
    switch (b.type) {
      case 'html':
        return [{ ...b, html: cleanHtml(b.html) }]
      case 'video':
      case 'document':
        return isHttps(b.url) ? [b] : [] // signed media URLs; never anything but https
      case 'check':
      case 'hazard':
        return [b]
      default:
        return []
    }
  })

type Q = { media?: { code?: string } | null; options?: { sign?: string }[] }
const signCodes = (qs: Q[]) => qs.flatMap((q) => [q.media?.code, ...(q.options ?? []).map((o) => o.sign)]).filter((c): c is string => !!c)

/**
 * Django's lesson/chapter responses come with `signs: {}` even when their questions show signs (a known issue in
 * the Learning API guide §5.2) — fill the gaps from GET /api/learn/signs/, cached for a few minutes.
 */
let signLibrary: { at: number; signs: Record<string, unknown> } | null = null
async function fillSigns(event: H3Event, data: Record<string, unknown>) {
  const qs = data.questions
  const list = (Array.isArray(qs) ? qs : qs && typeof qs === 'object' ? Object.values(qs) : []) as Q[]
  const have = (data.signs ?? {}) as Record<string, unknown>
  const missing = signCodes(list).filter((c) => !have[c])
  if (!missing.length) return
  if (!signLibrary || Date.now() - signLibrary.at > CHECK_MS) {
    const res = await djangoFetch<{ signs?: { code: string }[] }>(event, 'GET', '/api/learn/signs/', { auth: true }).catch(() => null)
    if (!res?.ok) return // can't fill: the card hides a sign it doesn't have
    signLibrary = { at: Date.now(), signs: Object.fromEntries((res.data.signs ?? []).map((s) => [s.code, s])) }
  }
  data.signs = { ...have, ...Object.fromEntries(missing.filter((c) => signLibrary!.signs[c]).map((c) => [c, signLibrary!.signs[c]])) }
}

/**
 * A learning call answered by Django. Its 402 ("plan needed") and 404 pass through unchanged, so the
 * pages behave exactly as with our own API; lesson blocks are cleaned, clips mapped and missing signs filled.
 *
 * Typed `never` by default on purpose: where Django serves the same shape as our local endpoint, a handler
 * written as `if (django) return djangoLearn(…)` keeps the response type of its local branch for the pages.
 */
export async function djangoLearn<T = never>(event: H3Event, method: string, path: string, body?: unknown): Promise<T> {
  let res = await djangoFetch<T>(event, method, path, { auth: true, body })
  // 429: back off and retry once (guide §18); a 429 means Django didn't process the request
  if (res.status === 429) {
    await new Promise((r) => setTimeout(r, RETRY_AFTER_MS))
    res = await djangoFetch<T>(event, method, path, { auth: true, body })
  }
  if (res.status === 402) throw createError({ statusCode: 402, statusMessage: 'An active plan is needed for this' })
  if (res.status === 404) throw createError({ statusCode: 404, statusMessage: 'Not found' })
  if (res.status === 401) throw createError({ statusCode: 401, statusMessage: 'Please log in' })
  if (!res.ok) throwDjangoError(res)
  const data = res.data as Record<string, unknown>
  if (data && typeof data === 'object') {
    for (const key of ['lesson', 'chapter']) {
      const part = data[key] as { blocks?: Block[] } | undefined
      if (part?.blocks) part.blocks = cleanBlocks(part.blocks)
    }
    // hazard clips referenced by lesson blocks → the filmed-clip shape our player and cards use
    if (data.clips && typeof data.clips === 'object' && !Array.isArray(data.clips)) {
      data.clips = Object.fromEntries(Object.entries(data.clips as Record<string, DjangoClip>).map(([slug, c]) => [slug, toVideoClipDto(c)]))
    }
    if ('questions' in data) await fillSigns(event, data)
  }
  return res.data
}
