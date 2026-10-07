import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  // Material from the Django backend once it has some (see server/utils/django-learn.ts)
  if (await useDjangoLearning(event)) {
    // Django records it (and its study days / streak): POST /api/learn/lessons/{slug}/complete/ → { done }
    const r = await djangoLearn<{ done: boolean }>(event, 'POST', `/api/learn/lessons/${encodeURIComponent(getRouterParam(event, 'slug')!)}/complete/`)
    return { ok: r.done }
  }
  const user = await requireAccess(event)
  const db = await useDb()
  const [lesson] = await db.select({ id: schema.lessons.id }).from(schema.lessons).where(eq(schema.lessons.slug, getRouterParam(event, 'slug')!))
  if (!lesson) throw createError({ statusCode: 404, statusMessage: 'Lesson not found' })
  await db.insert(schema.lessonProgress).values({ userId: user.id, lessonId: lesson.id }).onConflictDoNothing()
  return { ok: true }
})
