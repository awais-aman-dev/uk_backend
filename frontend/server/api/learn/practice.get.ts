import { and, desc, eq, inArray, isNull } from 'drizzle-orm'
import { z } from 'zod'

const query = z.object({
  mode: z.enum(['topic', 'random', 'mistakes', 'weak', 'saved', 'review']).default('random'),
  topic: z.string().optional(),
  count: z.coerce.number().int().min(1).max(50).default(10)
})

export default defineEventHandler(async (event) => {
  const user = await requireAccess(event)
  const q = query.parse(getQuery(event))
  const db = await useDb()
  const topics = await topicSlugs()
  const topicId = (slug?: string) => [...topics].find(([, s]) => s === slug)?.[0]

  let pool: (typeof schema.questions.$inferSelect)[] = []
  const published = eq(schema.questions.published, true)

  if (q.mode === 'topic') {
    const id = topicId(q.topic)
    if (!id) throw createError({ statusCode: 404, statusMessage: 'Topic not found' })
    pool = await db.select().from(schema.questions).where(and(published, eq(schema.questions.topicId, id)))
  } else if (q.mode === 'mistakes') {
    // Questions whose most recent attempt was wrong
    const attempts = await db
      .select({ questionId: schema.questionAttempts.questionId, correct: schema.questionAttempts.correct })
      .from(schema.questionAttempts)
      .where(eq(schema.questionAttempts.userId, user.id))
      .orderBy(desc(schema.questionAttempts.createdAt))
    const latest = new Map<number, boolean>()
    for (const a of attempts) if (!latest.has(a.questionId)) latest.set(a.questionId, a.correct)
    const wrong = [...latest].filter(([, ok]) => !ok).map(([id]) => id)
    pool = wrong.length ? await db.select().from(schema.questions).where(and(published, inArray(schema.questions.id, wrong))) : []
  } else if (q.mode === 'weak') {
    const { mastery } = await readiness(user.id)
    const ranked = [...topics.keys()].sort((a, b) => (mastery.get(a)?.mastery ?? 0) - (mastery.get(b)?.mastery ?? 0)).slice(0, 4)
    pool = await db.select().from(schema.questions).where(and(published, inArray(schema.questions.topicId, ranked)))
  } else if (q.mode === 'saved') {
    const saved = await db
      .select({ ref: schema.bookmarks.ref })
      .from(schema.bookmarks)
      .where(and(eq(schema.bookmarks.userId, user.id), eq(schema.bookmarks.kind, 'question')))
    const keys = saved.map((s) => s.ref)
    pool = keys.length ? await db.select().from(schema.questions).where(and(published, inArray(schema.questions.key, keys))) : []
  } else if (q.mode === 'review') {
    // Spaced repetition: due questions, the shakiest first (kept in that order, not shuffled)
    const { dueIds } = await reviewState(user.id)
    const rows = dueIds.length ? await db.select().from(schema.questions).where(and(published, inArray(schema.questions.id, dueIds.slice(0, q.count)))) : []
    const byId = new Map(rows.map((r) => [r.id, r]))
    pool = dueIds.map((id) => byId.get(id)).filter((r): r is NonNullable<typeof r> => !!r)
  } else {
    pool = await db.select().from(schema.questions).where(and(published, isNull(schema.questions.caseStudyId)))
  }

  const picked = q.mode === 'review' ? pool.slice(0, q.count) : shuffle(pool).slice(0, q.count)
  const saved = await db
    .select({ ref: schema.bookmarks.ref })
    .from(schema.bookmarks)
    .where(and(eq(schema.bookmarks.userId, user.id), eq(schema.bookmarks.kind, 'question')))

  return {
    questions: picked.map((row) => toQuestionDto(row, topics)),
    signs: await signsForQuestions(picked),
    saved: saved.map((s) => s.ref)
  }
})
