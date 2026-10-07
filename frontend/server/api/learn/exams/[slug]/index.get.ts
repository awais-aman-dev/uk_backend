import type { DjangoExam, QuestionDto, SignDto } from '#shared/types/learn'

// One exam's questions, without answers (guide §13.2). Keep the order; answers stay in the browser until submit.
export default defineEventHandler(async (event) =>
  djangoLearn<{ exam: DjangoExam; questions: QuestionDto[]; signs: Record<string, SignDto> }>(
    event,
    'GET',
    `/api/learn/exams/${encodeURIComponent(getRouterParam(event, 'slug')!)}/`
  )
)
