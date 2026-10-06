import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const user = await requireAccess(event)
  const db = await useDb()
  const [lesson] = await db.select({ id: schema.lessons.id }).from(schema.lessons).where(eq(schema.lessons.slug, getRouterParam(event, 'slug')!))
  if (!lesson) throw createError({ statusCode: 404, statusMessage: 'Lesson not found' })
  await db.insert(schema.lessonProgress).values({ userId: user.id, lessonId: lesson.id }).onConflictDoNothing()
  return { ok: true }
})
