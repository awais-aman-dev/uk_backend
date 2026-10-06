import { and, eq, isNull } from 'drizzle-orm'

// Starts a mock test: 7 random questions + 3 from a case study, 12 minutes.
export default defineEventHandler(async (event) => {
  const user = await requireAccess(event)
  const db = await useDb()
  const published = eq(schema.questions.published, true)
  const [regular, cases] = await Promise.all([
    db.select({ id: schema.questions.id }).from(schema.questions).where(and(published, isNull(schema.questions.caseStudyId))),
    db.select().from(schema.caseStudies)
  ])
  const caseStudy = shuffle(cases)[0]
  const caseQuestions = caseStudy
    ? await db.select({ id: schema.questions.id }).from(schema.questions).where(and(published, eq(schema.questions.caseStudyId, caseStudy.id)))
    : []
  const casePart = shuffle(caseQuestions).slice(0, MOCK_CASE_QUESTIONS)
  const questionIds = [...shuffle(regular).slice(0, MOCK_QUESTIONS - casePart.length).map((q) => q.id), ...casePart.map((q) => q.id)]

  const [attempt] = await db
    .insert(schema.mockAttempts)
    .values({
      userId: user.id,
      questionIds,
      caseStudyId: caseStudy?.id ?? null,
      deadlineAt: new Date(Date.now() + MOCK_MINUTES * 60_000)
    })
    .returning({ id: schema.mockAttempts.id })
  return { id: attempt!.id }
})
