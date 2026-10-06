import type { H3Event } from 'h3'
import { and, desc, eq, gt, inArray, sql } from 'drizzle-orm'
import type { Block, HazardClipDto, HazardResult, QuestionDto, SignDto } from '#shared/types/learn'
import { isCheating, scoreClick } from '#shared/hazard/motion'
import { z } from 'zod'

type QuestionRow = typeof schema.questions.$inferSelect
type ClipRow = typeof schema.hazardClips.$inferSelect

/** Learning access is decided by the Django backend (the learner's current subscription). */
export async function hasAccess(event: H3Event) {
  const sub = await getSubscription(event)
  return !!sub?.online_platform_activated
}

/** Paid content: 401 if signed out, 402 if the plan has ended. */
export async function requireAccess(event: H3Event) {
  const user = await requireUser(event)
  if (!(await hasAccess(event))) {
    throw createError({ statusCode: 402, statusMessage: 'An active plan is needed for this' })
  }
  return user
}

export async function topicSlugs() {
  const db = await useDb()
  const rows = await db.select({ id: schema.topics.id, slug: schema.topics.slug }).from(schema.topics)
  return new Map(rows.map((r) => [r.id, r.slug]))
}

export function toQuestionDto(q: QuestionRow, topics: Map<number, string>): QuestionDto {
  return {
    id: q.id,
    key: q.key,
    topic: topics.get(q.topicId) ?? '',
    type: q.type,
    prompt: q.prompt,
    media: q.media ?? null,
    options: q.options,
    pick: q.correct.length
  }
}

/** Scores clicks against a clip's hazard windows: the earliest click inside a window counts; a cheating pattern scores 0. */
export function scoreHazard(clip: Pick<ClipRow, 'hazards'>, clicks: number[]): HazardResult {
  const sorted = [...clicks].sort((a, b) => a - b)
  const flagged = isCheating(sorted)
  const windows = clip.hazards.map((w) => {
    const click = sorted.find((c) => c >= w.startMs && c <= w.endMs) ?? null
    return { ...w, clickMs: click, score: flagged || click === null ? 0 : scoreClick(w, click) }
  })
  return { score: windows.reduce((s, w) => s + w.score, 0), maxScore: clip.hazards.length * 5, flagged, windows, clicks: sorted }
}

/** Hazard clicks as the API accepts them (bounded by the clip length). */
export const hazardClicks = (durationMs: number) => z.object({ clicks: z.array(z.number().min(0).max(durationMs + 1000)).max(100) })

export function toClipDto(c: ClipRow): HazardClipDto {
  return {
    id: c.id,
    slug: c.slug,
    title: c.title,
    description: c.description,
    durationMs: c.scene.durationMs,
    hazardCount: c.hazards.length,
    scene: c.scene
  }
}

export const toSignDto = (s: typeof schema.signs.$inferSelect): SignDto => ({
  code: s.code,
  name: s.name,
  category: s.category,
  meaning: s.meaning,
  spec: s.spec
})

/** Everything a list of blocks refers to (signs, check questions, scene clips), so the page renders in one request. */
export async function resolveBlocks(blocks: Block[]) {
  const signCodes = new Set<string>()
  const questionKeys = new Set<string>()
  const clipSlugs = new Set<string>()
  for (const b of blocks) {
    if (b.type === 'signs') b.codes.forEach((c) => signCodes.add(c))
    if (b.type === 'check') b.questions.forEach((k) => questionKeys.add(k))
    if (b.type === 'scene') clipSlugs.add(b.clip)
  }
  const db = await useDb()
  const [signRows, questionRows, clipRows, topics] = await Promise.all([
    signCodes.size ? db.select().from(schema.signs).where(inArray(schema.signs.code, [...signCodes])) : [],
    questionKeys.size ? db.select().from(schema.questions).where(inArray(schema.questions.key, [...questionKeys])) : [],
    clipSlugs.size ? db.select().from(schema.hazardClips).where(inArray(schema.hazardClips.slug, [...clipSlugs])) : [],
    topicSlugs()
  ])
  return {
    // plus the signs used as media / image answers by the check questions
    signs: { ...(await signsForQuestions(questionRows)), ...Object.fromEntries(signRows.map((s) => [s.code, toSignDto(s)])) },
    questions: Object.fromEntries(questionRows.map((q) => [q.key, toQuestionDto(q, topics)])),
    clips: Object.fromEntries(clipRows.map((c) => [c.slug, toClipDto(c)]))
  }
}

/** Signs needed to render a set of questions (sign media and image answers). */
export async function signsForQuestions(rows: QuestionRow[]) {
  const codes = [...new Set(rows.flatMap((q) => [q.media?.code, ...q.options.map((o) => o.sign)]).filter((c): c is string => !!c))]
  if (!codes.length) return {}
  const db = await useDb()
  const signRows = await db.select().from(schema.signs).where(inArray(schema.signs.code, codes))
  return Object.fromEntries(signRows.map((s) => [s.code, toSignDto(s)]))
}

/** Signs placed as roadside props in hazard scenes */
export async function signsForScenes(scenes: { props: { kind: string; sign?: string }[] }[]) {
  const codes = [...new Set(scenes.flatMap((s) => s.props.filter((p) => p.kind === 'sign' && p.sign).map((p) => p.sign!)))]
  if (!codes.length) return {}
  const db = await useDb()
  const rows = await db.select().from(schema.signs).where(inArray(schema.signs.code, codes))
  return Object.fromEntries(rows.map((r) => [r.code, toSignDto(r)]))
}

export const sameAnswer = (a: string[], b: string[]) => a.length === b.length && [...a].sort().join() === [...b].sort().join()

/* ---------- Readiness ---------- */

const RECENT = 10

/** Per-topic mastery = correct answers among the last 10 attempts in that topic, out of 10. */
export async function topicMastery(userId: number) {
  const db = await useDb()
  const res = await db.execute(sql`
    select topic_id, sum(case when correct then 1 else 0 end)::int as correct, count(*)::int as total
    from (
      select q.topic_id, a.correct,
             row_number() over (partition by q.topic_id order by a.created_at desc) as rn
      from ${schema.questionAttempts} a
      join ${schema.questions} q on q.id = a.question_id
      where a.user_id = ${userId}
    ) recent
    where rn <= ${RECENT}
    group by topic_id
  `)
  const list = rowsOf<{ topic_id: number; correct: number; total: number }>(res)
  return new Map(list.map((r) => [Number(r.topic_id), { mastery: Number(r.correct) / RECENT, answered: Number(r.total) }]))
}

export async function readiness(userId: number) {
  const db = await useDb()
  const [topics, mastery, mocks, clips, best] = await Promise.all([
    db.select({ id: schema.topics.id }).from(schema.topics),
    topicMastery(userId),
    db
      .select({ score: schema.mockAttempts.score, total: sql<number>`jsonb_array_length(${schema.mockAttempts.questionIds})` })
      .from(schema.mockAttempts)
      .where(and(eq(schema.mockAttempts.userId, userId), eq(schema.mockAttempts.status, 'finished')))
      .orderBy(desc(schema.mockAttempts.finishedAt))
      .limit(3),
    db.select({ id: schema.hazardClips.id, hazards: schema.hazardClips.hazards }).from(schema.hazardClips).where(eq(schema.hazardClips.published, true)),
    db
      .select({ clipId: schema.hazardAttempts.clipId, best: sql<number>`max(${schema.hazardAttempts.score})` })
      .from(schema.hazardAttempts)
      .where(eq(schema.hazardAttempts.userId, userId))
      .groupBy(schema.hazardAttempts.clipId)
  ])
  const theory = topics.length ? topics.reduce((s, t) => s + (mastery.get(t.id)?.mastery ?? 0), 0) / topics.length : 0
  const mock = mocks.length ? mocks.reduce((s, m) => s + (m.score ?? 0) / Number(m.total), 0) / mocks.length : 0
  const bestBy = new Map(best.map((b) => [b.clipId, Number(b.best)]))
  const hpMax = clips.reduce((s, c) => s + c.hazards.length * 5, 0)
  const hazard = hpMax ? clips.reduce((s, c) => s + (bestBy.get(c.id) ?? 0), 0) / hpMax : 0
  const pct = (n: number) => Math.round(n * 100)
  return {
    overall: pct(theory * 0.5 + mock * 0.3 + hazard * 0.2),
    theory: pct(theory),
    mock: pct(mock),
    hazard: pct(hazard),
    mastery
  }
}

/* ---------- Activity / streak ---------- */

/** Distinct UK-local days with learning activity, newest first. */
export async function activityDays(userId: number, days = 120) {
  const db = await useDb()
  const res = await db.execute(sql`
    select to_char(ts at time zone 'Europe/London', 'YYYY-MM-DD') as day, count(*)::int as n from (
      select created_at as ts from ${schema.questionAttempts} where user_id = ${userId}
      union all select created_at from ${schema.hazardAttempts} where user_id = ${userId}
      union all select completed_at from ${schema.lessonProgress} where user_id = ${userId}
      union all select finished_at from ${schema.mockAttempts} where user_id = ${userId} and finished_at is not null
    ) a
    where ts > now() - (${days} || ' days')::interval
    group by 1 order by 1 desc
  `)
  const list = rowsOf<{ day: string; n: number }>(res)
  return list.map((r) => ({ day: r.day, n: Number(r.n) }))
}

export const ukToday = (d = new Date()) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/London', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d)

export function streakFrom(days: { day: string }[]) {
  const set = new Set(days.map((d) => d.day))
  let streak = 0
  const cursor = new Date()
  // Today not done yet doesn't break the streak
  if (!set.has(ukToday(cursor))) cursor.setUTCDate(cursor.getUTCDate() - 1)
  while (set.has(ukToday(cursor))) {
    streak++
    cursor.setUTCDate(cursor.getUTCDate() - 1)
  }
  return streak
}
