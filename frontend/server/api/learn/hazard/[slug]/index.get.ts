import { and, asc, eq } from 'drizzle-orm'

// The clip for playing. Hazard windows stay on the server until the attempt is scored.
// Our own (animated) clips first; a slug we don't have is looked up among Django's filmed clips.
export default defineEventHandler(async (event) => {
  if (await useDjangoLearning(event)) {
    const slug = getRouterParam(event, 'slug')!
    const filmed = await djangoHazardClip(event, slug)
    if (!filmed) throw createError({ statusCode: 404, statusMessage: 'Clip not found' })
    const list = await djangoHazardClips(event)
    const i = Math.max(0, list.findIndex((c) => c.slug === slug))
    return { clip: filmed, signs: {}, index: i, total: list.length, next: list[i + 1]?.slug ?? null }
  }
  await requireAccess(event)
  const db = await useDb()
  const all = await db
    .select({ slug: schema.hazardClips.slug })
    .from(schema.hazardClips)
    .where(eq(schema.hazardClips.published, true))
    .orderBy(asc(schema.hazardClips.position))
  const slug = getRouterParam(event, 'slug')!
  const [clip] = await db.select().from(schema.hazardClips).where(and(eq(schema.hazardClips.slug, slug), eq(schema.hazardClips.published, true)))
  if (clip) {
    const i = all.findIndex((c) => c.slug === slug)
    return { clip: toClipDto(clip), signs: await signsForScenes([clip.scene]), index: i, total: all.length, next: all[i + 1]?.slug ?? null }
  }

  const filmed = await djangoHazardClip(event, slug)
  if (!filmed) throw createError({ statusCode: 404, statusMessage: 'Clip not found' })
  // Filmed clips are listed before ours; after the last one, carry on with our first clip
  const list = await djangoHazardClips(event)
  const i = Math.max(0, list.findIndex((c) => c.slug === slug))
  return { clip: filmed, signs: {}, index: i, total: list.length + all.length, next: list[i + 1]?.slug ?? all[0]?.slug ?? null }
})
