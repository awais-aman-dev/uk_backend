import { eq, ilike, or, sql } from 'drizzle-orm'

// ⌘K search across lessons, topics, signs, e-book chapters and questions.
export default defineEventHandler(async (event) => {
  await requireUser(event)
  const q = String(getQuery(event).q ?? '').trim().slice(0, 60)
  if (q.length < 2) return { results: [] }
  const like = `%${q.replace(/[%_\\]/g, (c) => `\\${c}`)}%`
  const db = await useDb()

  const [lessons, topics, signs, chapters, questions] = await Promise.all([
    db
      .select({ slug: schema.lessons.slug, title: schema.lessons.title, summary: schema.lessons.summary })
      .from(schema.lessons)
      .where(or(ilike(schema.lessons.title, like), ilike(schema.lessons.summary, like), sql`${schema.lessons.blocks}::text ilike ${like}`))
      .limit(5),
    db.select().from(schema.topics).where(or(ilike(schema.topics.title, like), ilike(schema.topics.description, like))).limit(3),
    db.select().from(schema.signs).where(or(ilike(schema.signs.name, like), ilike(schema.signs.meaning, like))).limit(5),
    db
      .select({ slug: schema.ebookChapters.slug, title: schema.ebookChapters.title, summary: schema.ebookChapters.summary })
      .from(schema.ebookChapters)
      .where(or(ilike(schema.ebookChapters.title, like), sql`${schema.ebookChapters.blocks}::text ilike ${like}`))
      .limit(4),
    db
      .select({ prompt: schema.questions.prompt, topic: schema.topics.slug, topicTitle: schema.topics.title })
      .from(schema.questions)
      .innerJoin(schema.topics, eq(schema.topics.id, schema.questions.topicId))
      .where(ilike(schema.questions.prompt, like))
      .limit(4)
  ])

  return {
    results: [
      ...lessons.map((l) => ({ kind: 'Lesson', icon: 'lessons', title: l.title, sub: l.summary, to: `/learn/lessons/${l.slug}` })),
      ...topics.map((t) => ({ kind: 'Topic', icon: t.icon, title: t.title, sub: t.description, to: `/learn/practice?topic=${t.slug}` })),
      ...signs.map((s) => ({ kind: 'Sign', icon: 'sign', title: s.name, sub: s.meaning, to: `/learn/signs?sign=${s.code}`, sign: s.spec })),
      ...chapters.map((c) => ({ kind: 'Highway Code', icon: 'book', title: c.title, sub: c.summary, to: `/learn/ebook/${c.slug}` })),
      ...questions.map((x) => ({ kind: 'Question', icon: 'target', title: x.prompt, sub: x.topicTitle, to: `/learn/practice?topic=${x.topic}` }))
    ]
  }
})
