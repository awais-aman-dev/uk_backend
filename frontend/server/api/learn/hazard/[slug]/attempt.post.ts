import { eq } from 'drizzle-orm'
import type { HazardResult } from '#shared/types/learn'

export default defineEventHandler(async (event): Promise<HazardResult> => {
  const user = await requireAccess(event)
  const db = await useDb()
  const [clip] = await db.select().from(schema.hazardClips).where(eq(schema.hazardClips.slug, getRouterParam(event, 'slug')!))
  if (!clip) throw createError({ statusCode: 404, statusMessage: 'Clip not found' })

  const { clicks } = await readValidated(event, hazardClicks(clip.scene.durationMs))
  const result = scoreHazard(clip, clicks)
  await db.insert(schema.hazardAttempts).values({ userId: user.id, clipId: clip.id, clicks: result.clicks, score: result.score, maxScore: result.maxScore, flagged: result.flagged })
  return result
})
