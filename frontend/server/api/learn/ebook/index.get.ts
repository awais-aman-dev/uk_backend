import { asc, eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const db = await useDb()
  const [chapters, settings] = await Promise.all([
    db
      .select({ slug: schema.ebookChapters.slug, title: schema.ebookChapters.title, summary: schema.ebookChapters.summary })
      .from(schema.ebookChapters)
      .orderBy(asc(schema.ebookChapters.position)),
    db.select().from(schema.learnerSettings).where(eq(schema.learnerSettings.userId, user.id)).then((r) => r[0])
  ])
  const read = new Set(settings?.ebookRead ?? [])
  return {
    chapters: chapters.map((c, i) => ({ ...c, number: i + 1, read: read.has(c.slug) })),
    current: settings?.ebookChapter ?? null
  }
})
