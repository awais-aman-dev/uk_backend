import { asc, eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const user = await requireAccess(event)
  const slug = getRouterParam(event, 'slug')!
  const db = await useDb()
  const all = await db.select().from(schema.ebookChapters).orderBy(asc(schema.ebookChapters.position))
  const i = all.findIndex((c) => c.slug === slug)
  const chapter = all[i]
  if (!chapter) throw createError({ statusCode: 404, statusMessage: 'Chapter not found' })

  // Remember where the reader is
  await db
    .insert(schema.learnerSettings)
    .values({ userId: user.id, ebookChapter: slug })
    .onConflictDoUpdate({ target: schema.learnerSettings.userId, set: { ebookChapter: slug } })

  const refs = await resolveBlocks(chapter.blocks)
  return {
    chapter: { slug: chapter.slug, title: chapter.title, summary: chapter.summary, blocks: chapter.blocks, number: i + 1 },
    toc: all.map((c, n) => ({ slug: c.slug, title: c.title, number: n + 1 })),
    prev: all[i - 1] ? { slug: all[i - 1]!.slug, title: all[i - 1]!.title } : null,
    next: all[i + 1] ? { slug: all[i + 1]!.slug, title: all[i + 1]!.title } : null,
    ...refs
  }
})
