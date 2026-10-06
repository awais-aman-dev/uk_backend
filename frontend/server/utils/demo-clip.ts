import { and, eq } from 'drizzle-orm'

/** The clip anyone can play on the landing page (scored on the server, nothing saved). */
export const DEMO_CLIP = 'school-run'

export async function loadDemoClip() {
  const db = await useDb()
  const [clip] = await db
    .select()
    .from(schema.hazardClips)
    .where(and(eq(schema.hazardClips.slug, DEMO_CLIP), eq(schema.hazardClips.published, true)))
  if (!clip) throw createError({ statusCode: 404, statusMessage: 'Demo clip not found' })
  return clip
}
