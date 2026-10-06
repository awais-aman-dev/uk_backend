import { and, asc, eq } from 'drizzle-orm'

// The scene for playing. Hazard windows stay on the server until the attempt is scored.
export default defineEventHandler(async (event) => {
  await requireAccess(event)
  const db = await useDb()
  const all = await db
    .select({ slug: schema.hazardClips.slug })
    .from(schema.hazardClips)
    .where(eq(schema.hazardClips.published, true))
    .orderBy(asc(schema.hazardClips.position))
  const slug = getRouterParam(event, 'slug')!
  const [clip] = await db.select().from(schema.hazardClips).where(and(eq(schema.hazardClips.slug, slug), eq(schema.hazardClips.published, true)))
  if (!clip) throw createError({ statusCode: 404, statusMessage: 'Clip not found' })
  const i = all.findIndex((c) => c.slug === slug)
  return { clip: toClipDto(clip), signs: await signsForScenes([clip.scene]), index: i, total: all.length, next: all[i + 1]?.slug ?? null }
})
