import { asc, eq } from 'drizzle-orm'

// The catalogue (titles only) — visible to any signed-in user, so locked screens can still show what's inside.
export default defineEventHandler(async (event) => {
  // Material from the Django backend once it has some (see server/utils/django-learn.ts)
  if (await useDjangoLearning(event)) return djangoLearn(event, 'GET', '/api/learn/topics/')
  const user = await requireUser(event)
  const db = await useDb()
  const [topics, lessons, done, ready, questionCounts] = await Promise.all([
    db.select().from(schema.topics).orderBy(asc(schema.topics.position)),
    db
      .select({ slug: schema.lessons.slug, title: schema.lessons.title, summary: schema.lessons.summary, minutes: schema.lessons.minutes, topicId: schema.lessons.topicId, id: schema.lessons.id })
      .from(schema.lessons)
      .where(eq(schema.lessons.published, true))
      .orderBy(asc(schema.lessons.position)),
    db.select({ lessonId: schema.lessonProgress.lessonId }).from(schema.lessonProgress).where(eq(schema.lessonProgress.userId, user.id)),
    readiness(user.id),
    db.select({ topicId: schema.questions.topicId }).from(schema.questions).where(eq(schema.questions.published, true))
  ])
  const doneIds = new Set(done.map((d) => d.lessonId))
  return {
    topics: topics.map((t) => ({
      slug: t.slug,
      title: t.title,
      description: t.description,
      icon: t.icon,
      mastery: Math.round((ready.mastery.get(t.id)?.mastery ?? 0) * 100),
      questions: questionCounts.filter((q) => q.topicId === t.id).length,
      lessons: lessons
        .filter((l) => l.topicId === t.id)
        .map((l) => ({ slug: l.slug, title: l.title, summary: l.summary, minutes: l.minutes, done: doneIds.has(l.id) }))
    }))
  }
})
