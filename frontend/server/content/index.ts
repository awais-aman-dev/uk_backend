import { eq, sql } from 'drizzle-orm'
import * as schema from '../db/schema'
import type { Db } from '../utils/db'
import { TOPICS } from './topics'
import { LESSONS } from './lessons'
import { CASE_STUDIES, QUESTIONS } from './questions'
import { SIGNS } from './signs'
import { HAZARD_CLIPS } from './hazard-clips'
import { EBOOK } from './ebook'

/** Bump when server/content changes; the next start upserts it (rows created in the admin are left alone). */
const CONTENT_VERSION = '2026-10-05.4'

export async function seedContentIfNeeded(db: Db) {
  const [meta] = await db.select().from(schema.contentMeta).where(eq(schema.contentMeta.key, 'version'))
  if (meta?.value === CONTENT_VERSION) return
  await seedContent(db)
  await db
    .insert(schema.contentMeta)
    .values({ key: 'version', value: CONTENT_VERSION })
    .onConflictDoUpdate({ target: schema.contentMeta.key, set: { value: CONTENT_VERSION } })
}

const excluded = (col: string) => sql.raw(`excluded.${col}`)

async function seedContent(db: Db) {
  await db.transaction(async (tx) => {
    const topicRows = await tx
      .insert(schema.topics)
      .values(TOPICS.map((t, i) => ({ ...t, position: i })))
      .onConflictDoUpdate({
        target: schema.topics.slug,
        set: { title: excluded('title'), description: excluded('description'), icon: excluded('icon'), position: excluded('position') }
      })
      .returning({ id: schema.topics.id, slug: schema.topics.slug })
    const topicId = new Map(topicRows.map((t) => [t.slug, t.id]))

    const lessonRows = await tx
      .insert(schema.lessons)
      .values(
        LESSONS.map((l, i) => ({
          slug: l.slug,
          topicId: topicId.get(l.topic)!,
          title: l.title,
          summary: l.summary,
          minutes: l.minutes,
          blocks: l.blocks,
          position: i
        }))
      )
      .onConflictDoUpdate({
        target: schema.lessons.slug,
        set: {
          topicId: excluded('topic_id'),
          title: excluded('title'),
          summary: excluded('summary'),
          minutes: excluded('minutes'),
          blocks: excluded('blocks'),
          position: excluded('position')
        }
      })
      .returning({ id: schema.lessons.id, slug: schema.lessons.slug })
    const lessonId = new Map(lessonRows.map((l) => [l.slug, l.id]))

    const caseRows = await tx
      .insert(schema.caseStudies)
      .values(CASE_STUDIES)
      .onConflictDoUpdate({ target: schema.caseStudies.key, set: { title: excluded('title'), scenario: excluded('scenario') } })
      .returning({ id: schema.caseStudies.id, key: schema.caseStudies.key })
    const caseId = new Map(caseRows.map((c) => [c.key, c.id]))

    await tx
      .insert(schema.questions)
      .values(
        QUESTIONS.map((q) => ({
          key: q.key,
          topicId: topicId.get(q.topic)!,
          lessonId: q.lesson ? (lessonId.get(q.lesson) ?? null) : null,
          caseStudyId: q.caseStudy ? (caseId.get(q.caseStudy) ?? null) : null,
          type: q.type,
          prompt: q.prompt,
          media: q.media ?? null,
          options: q.options,
          correct: q.correct,
          explanation: q.explanation
        }))
      )
      .onConflictDoUpdate({
        target: schema.questions.key,
        set: {
          topicId: excluded('topic_id'),
          lessonId: excluded('lesson_id'),
          caseStudyId: excluded('case_study_id'),
          type: excluded('type'),
          prompt: excluded('prompt'),
          media: excluded('media'),
          options: excluded('options'),
          correct: excluded('correct'),
          explanation: excluded('explanation')
        }
      })

    await tx
      .insert(schema.signs)
      .values(SIGNS.map((s, i) => ({ ...s, position: i })))
      .onConflictDoUpdate({
        target: schema.signs.code,
        set: { name: excluded('name'), category: excluded('category'), meaning: excluded('meaning'), spec: excluded('spec'), position: excluded('position') }
      })

    await tx
      .insert(schema.hazardClips)
      .values(HAZARD_CLIPS.map((c, i) => ({ ...c, position: i })))
      .onConflictDoUpdate({
        target: schema.hazardClips.slug,
        set: { title: excluded('title'), description: excluded('description'), scene: excluded('scene'), hazards: excluded('hazards'), position: excluded('position') }
      })

    await tx
      .insert(schema.ebookChapters)
      .values(EBOOK.map((c, i) => ({ ...c, position: i })))
      .onConflictDoUpdate({
        target: schema.ebookChapters.slug,
        set: { title: excluded('title'), summary: excluded('summary'), blocks: excluded('blocks'), position: excluded('position') }
      })
  })
}
