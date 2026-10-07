import type { H3Event } from 'h3'
import sanitizeHtml from 'sanitize-html'
import type { Block } from '#shared/types/learn'

/*
 * The learning material moves to the Django backend (its /api/learn/* follows docs/openapi.yaml).
 * Until a deployment has it — and has content in it — this app keeps serving its own material, so the
 * learning area is never empty. The switch is automatic: once Django answers /api/learn/topics/ with
 * at least one topic, topics, lessons, the e-book, signs, practice and answer checking come from Django.
 */

const CHECK_MS = 5 * 60_000
let decided: { at: number; django: boolean } | null = null

/** Whether the learning material should come from Django (checked every few minutes, with the visitor's session). */
export async function useDjangoLearning(event: H3Event): Promise<boolean> {
  if (decided && Date.now() - decided.at < CHECK_MS) return decided.django
  const user = await getSessionUser(event)
  if (!user) return decided?.django ?? false // can't ask without a session; keep the last answer
  try {
    const res = await djangoFetch<{ topics?: unknown[] }>(event, 'GET', '/api/learn/topics/', { auth: true })
    decided = { at: Date.now(), django: res.ok && (res.data.topics?.length ?? 0) > 0 }
  } catch {
    decided = { at: Date.now(), django: false }
  }
  return decided.django
}

/** Theory HTML written in the Django admin, reduced to safe formatting before it reaches the page. */
const cleanHtml = (html: string) =>
  sanitizeHtml(html, {
    allowedTags: [...sanitizeHtml.defaults.allowedTags, 'img', 'h2', 'h3', 'h4', 'figure', 'figcaption'],
    allowedAttributes: { a: ['href', 'title'], img: ['src', 'alt', 'width', 'height'], td: ['colspan', 'rowspan'], th: ['colspan', 'rowspan'] },
    allowedSchemes: ['https', 'mailto'],
    transformTags: { a: sanitizeHtml.simpleTransform('a', { rel: 'noopener noreferrer', target: '_blank' }) }
  })

const cleanBlocks = (blocks: Block[] = []) => blocks.map((b) => (b.type === 'html' ? { ...b, html: cleanHtml(b.html) } : b))

/**
 * A learning call answered by Django. Its 402 ("plan needed") and 404 pass through unchanged, so the
 * pages behave exactly as with our own API; lesson and chapter HTML is sanitised on the way.
 *
 * Typed `never` by default on purpose: Django serves the same contract as the local endpoint
 * (docs/openapi.yaml), so a handler written as `if (django) return djangoLearn(…)` keeps the response
 * type of its local branch for the pages.
 */
export async function djangoLearn<T = never>(event: H3Event, method: string, path: string, body?: unknown): Promise<T> {
  const res = await djangoFetch<T>(event, method, path, { auth: true, body })
  if (res.status === 402) throw createError({ statusCode: 402, statusMessage: 'An active plan is needed for this' })
  if (res.status === 404) throw createError({ statusCode: 404, statusMessage: 'Not found' })
  if (res.status === 401) throw createError({ statusCode: 401, statusMessage: 'Please log in' })
  if (!res.ok) throwDjangoError(res)
  const data = res.data as Record<string, unknown>
  for (const key of ['lesson', 'chapter']) {
    const part = data?.[key] as { blocks?: Block[] } | undefined
    if (part?.blocks) part.blocks = cleanBlocks(part.blocks)
  }
  return res.data
}
