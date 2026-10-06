import { boolean, date, index, integer, jsonb, pgEnum, pgTable, primaryKey, serial, text, timestamp } from 'drizzle-orm/pg-core'
import type { Block, HazardScene, HazardWindow, QuestionMedia, QuestionOption, SignSpec } from '../../shared/types/learn'

const createdAt = () => timestamp('created_at', { withTimezone: true }).defaultNow().notNull()

/**
 * Learners as this app knows them. Accounts, passwords, payments and access live in the Django backend;
 * a row here only anchors learning progress to the Django account (created on first sign-in).
 */
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  /** Account id in the Django backend */
  djangoId: text('django_id').notNull().unique(),
  /** Copy for display; Django owns the email (and its uniqueness) */
  email: text('email').notNull(),
  name: text('name').notNull(),
  createdAt: createdAt()
})

/**
 * Study time: a visit is a burst of activity in an open tab (heartbeat once a minute); a new one starts
 * after 30 minutes of silence. Duration = last_seen_at - started_at.
 */
export const visits = pgTable(
  'visits',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    startedAt: timestamp('started_at', { withTimezone: true }).defaultNow().notNull(),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).defaultNow().notNull()
  },
  (t) => [index('visits_user_idx').on(t.userId, t.startedAt)]
)

/** Contact form messages (kept here until the Django backend has an endpoint for them) */
export const contactMessages = pgTable('contact_messages', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id, { onDelete: 'set null' }),
  name: text('name').notNull(),
  email: text('email').notNull(),
  topic: text('topic').notNull(),
  message: text('message').notNull(),
  createdAt: createdAt()
})

export type User = typeof users.$inferSelect

/* ==========================================================================
   Learning content — seeded from server/content, editable in the admin
   ========================================================================== */

export const questionTypeEnum = pgEnum('question_type', ['single', 'multi', 'image'])
export const signCategoryEnum = pgEnum('sign_category', ['warning', 'regulatory', 'information', 'motorway'])

export const topics = pgTable('topics', {
  id: serial('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  icon: text('icon').notNull(),
  position: integer('position').notNull()
})

export const lessons = pgTable('lessons', {
  id: serial('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  topicId: integer('topic_id')
    .notNull()
    .references(() => topics.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  summary: text('summary').notNull(),
  minutes: integer('minutes').notNull(),
  blocks: jsonb('blocks').$type<Block[]>().notNull(),
  position: integer('position').notNull(),
  published: boolean('published').default(true).notNull()
})

export const caseStudies = pgTable('case_studies', {
  id: serial('id').primaryKey(),
  key: text('key').notNull().unique(),
  title: text('title').notNull(),
  scenario: text('scenario').notNull()
})

export const questions = pgTable(
  'questions',
  {
    id: serial('id').primaryKey(),
    key: text('key').notNull().unique(),
    topicId: integer('topic_id')
      .notNull()
      .references(() => topics.id, { onDelete: 'cascade' }),
    lessonId: integer('lesson_id').references(() => lessons.id, { onDelete: 'set null' }),
    caseStudyId: integer('case_study_id').references(() => caseStudies.id, { onDelete: 'set null' }),
    type: questionTypeEnum('type').notNull(),
    prompt: text('prompt').notNull(),
    media: jsonb('media').$type<QuestionMedia | null>(),
    options: jsonb('options').$type<QuestionOption[]>().notNull(),
    correct: jsonb('correct').$type<string[]>().notNull(),
    explanation: text('explanation').notNull(),
    published: boolean('published').default(true).notNull()
  },
  (t) => [index('questions_topic_idx').on(t.topicId)]
)

export const hazardClips = pgTable('hazard_clips', {
  id: serial('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  scene: jsonb('scene').$type<HazardScene>().notNull(),
  hazards: jsonb('hazards').$type<HazardWindow[]>().notNull(),
  position: integer('position').notNull(),
  published: boolean('published').default(true).notNull()
})

export const signs = pgTable('signs', {
  id: serial('id').primaryKey(),
  code: text('code').notNull().unique(),
  name: text('name').notNull(),
  category: signCategoryEnum('category').notNull(),
  meaning: text('meaning').notNull(),
  spec: jsonb('spec').$type<SignSpec>().notNull(),
  position: integer('position').notNull()
})

export const ebookChapters = pgTable('ebook_chapters', {
  id: serial('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  title: text('title').notNull(),
  summary: text('summary').notNull(),
  blocks: jsonb('blocks').$type<Block[]>().notNull(),
  position: integer('position').notNull()
})

/** Which version of server/content has been seeded */
export const contentMeta = pgTable('content_meta', {
  key: text('key').primaryKey(),
  value: text('value').notNull()
})

/* ==========================================================================
   Learner progress
   ========================================================================== */

const userRef = () =>
  integer('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' })

export const questionAttempts = pgTable(
  'question_attempts',
  {
    id: serial('id').primaryKey(),
    userId: userRef(),
    questionId: integer('question_id')
      .notNull()
      .references(() => questions.id, { onDelete: 'cascade' }),
    selected: jsonb('selected').$type<string[]>().notNull(),
    correct: boolean('correct').notNull(),
    mode: text('mode', { enum: ['practice', 'mock', 'lesson'] }).notNull(),
    createdAt: createdAt()
  },
  (t) => [index('question_attempts_user_idx').on(t.userId, t.createdAt)]
)

export const lessonProgress = pgTable(
  'lesson_progress',
  {
    userId: userRef(),
    lessonId: integer('lesson_id')
      .notNull()
      .references(() => lessons.id, { onDelete: 'cascade' }),
    completedAt: timestamp('completed_at', { withTimezone: true }).defaultNow().notNull()
  },
  (t) => [primaryKey({ columns: [t.userId, t.lessonId] })]
)

export const mockAttempts = pgTable(
  'mock_attempts',
  {
    id: serial('id').primaryKey(),
    userId: userRef(),
    questionIds: jsonb('question_ids').$type<number[]>().notNull(),
    caseStudyId: integer('case_study_id').references(() => caseStudies.id, { onDelete: 'set null' }),
    answers: jsonb('answers').$type<Record<string, string[]>>().default({}).notNull(),
    flagged: jsonb('flagged').$type<number[]>().default([]).notNull(),
    status: text('status', { enum: ['in_progress', 'finished'] }).default('in_progress').notNull(),
    score: integer('score'),
    startedAt: createdAt(),
    deadlineAt: timestamp('deadline_at', { withTimezone: true }).notNull(),
    finishedAt: timestamp('finished_at', { withTimezone: true })
  },
  (t) => [index('mock_attempts_user_idx').on(t.userId, t.startedAt)]
)

export const hazardAttempts = pgTable(
  'hazard_attempts',
  {
    id: serial('id').primaryKey(),
    userId: userRef(),
    clipId: integer('clip_id')
      .notNull()
      .references(() => hazardClips.id, { onDelete: 'cascade' }),
    clicks: jsonb('clicks').$type<number[]>().notNull(),
    score: integer('score').notNull(),
    maxScore: integer('max_score').notNull(),
    flagged: boolean('flagged').default(false).notNull(),
    createdAt: createdAt()
  },
  (t) => [index('hazard_attempts_user_idx').on(t.userId, t.createdAt)]
)

export const bookmarks = pgTable(
  'bookmarks',
  {
    userId: userRef(),
    kind: text('kind', { enum: ['question', 'lesson', 'sign', 'chapter'] }).notNull(),
    ref: text('ref').notNull(),
    createdAt: createdAt()
  },
  (t) => [primaryKey({ columns: [t.userId, t.kind, t.ref] })]
)

export const learnerSettings = pgTable('learner_settings', {
  userId: integer('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  testDate: date('test_date'),
  dailyGoal: integer('daily_goal').default(20).notNull(),
  ebookChapter: text('ebook_chapter'),
  ebookRead: jsonb('ebook_read').$type<string[]>().default([]).notNull()
})
