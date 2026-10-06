import { eq, inArray } from 'drizzle-orm'

// In progress: questions without answers. Finished: full review with answers, explanations and topic breakdown.
export default defineEventHandler(async (event) => {
  const user = await requireAccess(event)
  let attempt = await loadAttempt(user.id, Number(getRouterParam(event, 'id')))
  if (attempt.status === 'in_progress' && attempt.deadlineAt < new Date()) attempt = await finishAttempt(attempt)

  const db = await useDb()
  const [rows, topics] = await Promise.all([
    db.select().from(schema.questions).where(inArray(schema.questions.id, attempt.questionIds)),
    topicSlugs()
  ])
  const byId = new Map(rows.map((r) => [r.id, r]))
  const ordered = attempt.questionIds.map((id) => byId.get(id)).filter((q): q is NonNullable<typeof q> => !!q)
  const caseStudy = attempt.caseStudyId
    ? await db.select().from(schema.caseStudies).where(eq(schema.caseStudies.id, attempt.caseStudyId)).then((r) => r[0] ?? null)
    : null

  const base = {
    id: attempt.id,
    status: attempt.status,
    deadlineAt: attempt.deadlineAt.toISOString(),
    startedAt: attempt.startedAt.toISOString(),
    pass: passMark(attempt.questionIds.length),
    caseStudy: caseStudy ? { title: caseStudy.title, scenario: caseStudy.scenario, ids: ordered.filter((q) => q.caseStudyId === caseStudy.id).map((q) => q.id) } : null,
    questions: ordered.map((q) => toQuestionDto(q, topics)),
    signs: await signsForQuestions(ordered),
    answers: attempt.answers,
    flagged: attempt.flagged
  }
  if (attempt.status === 'in_progress') return { ...base, result: null }

  const topicTitles = new Map((await db.select().from(schema.topics)).map((t) => [t.id, t.title]))
  const breakdown = new Map<string, { topic: string; correct: number; total: number }>()
  const review = ordered.map((q) => {
    const selected = attempt.answers[String(q.id)] ?? []
    const correct = sameAnswer(selected, q.correct)
    const title = topicTitles.get(q.topicId) ?? ''
    const b = breakdown.get(title) ?? { topic: title, correct: 0, total: 0 }
    b.total++
    if (correct) b.correct++
    breakdown.set(title, b)
    return { id: q.id, correct, correctIds: q.correct, explanation: q.explanation }
  })
  return {
    ...base,
    result: {
      score: attempt.score ?? 0,
      total: ordered.length,
      passed: (attempt.score ?? 0) >= passMark(ordered.length),
      seconds: Math.round(((attempt.finishedAt ?? new Date()).getTime() - attempt.startedAt.getTime()) / 1000),
      review,
      breakdown: [...breakdown.values()].sort((a, b) => a.correct / a.total - b.correct / b.total)
    }
  }
})
