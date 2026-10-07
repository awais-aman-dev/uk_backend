import type { H3Event } from 'h3'
import type { HazardResult, HazardVideoClipDto } from '#shared/types/learn'

/*
 * Filmed hazard clips from the Django backend (/api/learn/hazard/*). They sit alongside our own animated
 * clips: Django scores them, we only translate — clicks go out in seconds, the result comes back in the
 * shape our player and review already use.
 */

interface DjangoClip {
  slug: string
  title: string
  description: string
  url: string
  durationSeconds: number | null
  hazards: number
  topScore: number
  maxClicks: number
}
interface DjangoAttemptResult {
  score: number
  topScore: number
  voided: boolean
  hazards: { label: string; startsAt: number; endsAt: number; score: number; spotted: boolean }[]
}

const toDto = (c: DjangoClip): HazardVideoClipDto => ({
  kind: 'video',
  slug: c.slug,
  title: c.title,
  description: c.description,
  durationMs: c.durationSeconds ? c.durationSeconds * 1000 : null,
  hazardCount: c.hazards,
  maxClicks: c.maxClicks,
  url: c.url
})

/** How long the clip list waits for Django: a sleeping Render instance takes up to a minute to wake. */
const LIST_WAIT_MS = 5000

/**
 * Django's clips for this learner; [] when there are none, there's no plan, or Django is slow or unreachable —
 * our own clips must never wait on it.
 */
export async function djangoHazardClips(event: H3Event): Promise<HazardVideoClipDto[]> {
  if (!(await getSessionUser(event))) return []
  const fetchList = djangoFetch<{ clips?: DjangoClip[] }>(event, 'GET', '/api/learn/hazard/', { auth: true })
    .then((res) => (res.ok ? (res.data.clips ?? []).map(toDto) : []))
    .catch(() => [] as HazardVideoClipDto[])
  const giveUp = new Promise<HazardVideoClipDto[]>((resolve) => setTimeout(() => resolve([]), LIST_WAIT_MS))
  return Promise.race([fetchList, giveUp])
}

/** One clip to play (fresh signed video URL). null if Django doesn't have it; 402 passes through. */
export async function djangoHazardClip(event: H3Event, slug: string): Promise<HazardVideoClipDto | null> {
  const res = await djangoFetch<DjangoClip>(event, 'GET', `/api/learn/hazard/${encodeURIComponent(slug)}/`, { auth: true })
  if (res.status === 402) throw createError({ statusCode: 402, statusMessage: 'An active plan is needed for this' })
  if (res.status === 404) return null
  if (!res.ok) throwDjangoError(res)
  return toDto(res.data)
}

/** Score an attempt on Django. Clicks are milliseconds into the clip here, seconds there. */
export async function djangoHazardAttempt(event: H3Event, slug: string, clicksMs: number[]): Promise<HazardResult> {
  const clicks = [...clicksMs].sort((a, b) => a - b)
  const res = await djangoFetch<DjangoAttemptResult>(event, 'POST', `/api/learn/hazard/${encodeURIComponent(slug)}/attempt/`, {
    auth: true,
    body: { clicks: clicks.map((ms) => Math.round(ms) / 1000) }
  })
  if (res.status === 402) throw createError({ statusCode: 402, statusMessage: 'An active plan is needed for this' })
  if (res.status === 404) throw createError({ statusCode: 404, statusMessage: 'Clip not found' })
  if (!res.ok) throwDjangoError(res)
  const r = res.data
  return {
    score: r.score,
    maxScore: r.topScore,
    flagged: r.voided,
    clicks,
    windows: r.hazards.map((h, i) => {
      const startMs = Math.round(h.startsAt * 1000)
      const endMs = Math.round(h.endsAt * 1000)
      // the response that counted: the first click inside the window (Django scores the best = earliest)
      const clickMs = h.spotted ? clicks.find((c) => c >= startMs && c <= endMs) ?? null : null
      return { id: `h${i}`, label: h.label, startMs, endMs, score: h.score, clickMs }
    })
  }
}
