import { and, asc, eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const user = await requireAccess(event)
  const slug = getRouterParam(event, 'slug')!
  const db = await useDb()
  const [lesson] = await db.select().from(schema.lessons).where(and(eq(schema.lessons.slug, slug), eq(schema.lessons.published, true)))
  if (!lesson) throw createError({ statusCode: 404, statusMessage: 'Lesson not found' })

  const [topic, siblings, done, refs] = await Promise.all([
    db.select().from(schema.topics).where(eq(schema.topics.id, lesson.topicId)).then((r) => r[0]!),
    db
      .select({ slug: schema.lessons.slug, title: schema.lessons.title })
      .from(schema.lessons)
      .where(eq(schema.lessons.published, true))
      .orderBy(asc(schema.lessons.position)),
    db
      .select()
      .from(schema.lessonProgress)
      .where(and(eq(schema.lessonProgress.userId, user.id), eq(schema.lessonProgress.lessonId, lesson.id)))
      .then((r) => r[0]),
    resolveBlocks(lesson.blocks)
  ])
  const i = siblings.findIndex((s) => s.slug === slug)
  return {
    lesson: { slug: lesson.slug, title: lesson.title, summary: lesson.summary, minutes: lesson.minutes, blocks: lesson.blocks },
    topic: { slug: topic.slug, title: topic.title, icon: topic.icon },
    done: !!done,
    prev: siblings[i - 1] ?? null,
    next: siblings[i + 1] ?? null,
    ...refs
  }
})
