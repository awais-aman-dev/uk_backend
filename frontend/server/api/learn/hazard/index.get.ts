import { asc, eq, sql } from 'drizzle-orm'
import type { DjangoClip } from '../../../utils/django-hazard'

export default defineEventHandler(async (event) => {
  // Django mode: Django's clips only (Learning API guide §15)
  if (await useDjangoLearning(event)) {
    const filmed = await djangoLearn<{ clips: DjangoClip[] }>(event, 'GET', '/api/learn/hazard/')
    return {
      clips: filmed.clips.map(toVideoClipDto).map((c) => ({
        slug: c.slug,
        title: c.title,
        description: c.description,
        durationMs: c.durationMs,
        lighting: null,
        hazardCount: c.hazardCount,
        maxScore: c.hazardCount * 5,
        best: null,
        tries: 0,
        scene: null,
        video: true,
        locked: false
      })),
      signs: {}
    }
  }
  const user = await requireUser(event)
  const db = await useDb()
  const access = await hasAccess(event)
  const [clips, best] = await Promise.all([
    db.select().from(schema.hazardClips).where(eq(schema.hazardClips.published, true)).orderBy(asc(schema.hazardClips.position)),
    db
      .select({ clipId: schema.hazardAttempts.clipId, best: sql<number>`max(${schema.hazardAttempts.score})`, tries: sql<number>`count(*)::int` })
      .from(schema.hazardAttempts)
      .where(eq(schema.hazardAttempts.userId, user.id))
      .groupBy(schema.hazardAttempts.clipId)
  ])
  const by = new Map(best.map((b) => [b.clipId, b]))
  // Filmed clips from the Django backend come first; Django keeps their scores (see server/utils/django-hazard.ts)
  const filmed = access ? await djangoHazardClips(event) : []
  return {
    clips: [
      ...filmed.map((c) => ({
        slug: c.slug,
        title: c.title,
        description: c.description,
        durationMs: c.durationMs,
        lighting: null,
        hazardCount: c.hazardCount,
        maxScore: c.hazardCount * 5,
        best: null,
        tries: 0,
        scene: null,
        video: true,
        locked: false
      })),
      ...clips.map((c) => ({
        slug: c.slug,
        title: c.title,
        description: c.description,
        durationMs: c.scene.durationMs,
        lighting: c.scene.lighting,
        hazardCount: c.hazards.length,
        maxScore: c.hazards.length * 5,
        best: by.has(c.id) ? Number(by.get(c.id)!.best) : null,
        tries: by.get(c.id)?.tries ?? 0,
        // Scene for the card preview (no hazard windows) — paid content, so only with an active plan
        scene: access ? c.scene : null,
        video: false,
        locked: !access
      }))
    ],
    signs: access ? await signsForScenes(clips.map((c) => c.scene)) : {}
  }
})
