import { eq } from 'drizzle-orm'
import { z } from 'zod'
import type { HazardResult } from '#shared/types/learn'

export default defineEventHandler(async (event): Promise<HazardResult> => {
  const slug = getRouterParam(event, 'slug')!
  const filmedClicks = () => readValidated(event, z.object({ clicks: z.array(z.number().min(0).max(600_000)).max(100) }))
  if (await useDjangoLearning(event)) return djangoHazardAttempt(event, slug, (await filmedClicks()).clicks)
  const user = await requireAccess(event)
  const db = await useDb()
  const [clip] = await db.select().from(schema.hazardClips).where(eq(schema.hazardClips.slug, slug))

  // Not one of ours: a filmed clip, scored by Django (its length isn't known here — at most 10 minutes)
  if (!clip) return djangoHazardAttempt(event, slug, (await filmedClicks()).clicks)

  const { clicks } = await readValidated(event, hazardClicks(clip.scene.durationMs))
  const result = scoreHazard(clip, clicks)
  await db.insert(schema.hazardAttempts).values({ userId: user.id, clipId: clip.id, clicks: result.clicks, score: result.score, maxScore: result.maxScore, flagged: result.flagged })
  return result
})
