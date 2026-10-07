import type { DjangoExam } from '#shared/types/learn'

// Django's exams (Learning API guide §13.1). `kind` = mock | practice; omitted → both.
// An exam the learner's package doesn't fully cover is simply not listed.
export default defineEventHandler(async (event) => {
  const kind = getQuery(event).kind
  const q = kind === 'mock' || kind === 'practice' ? `?kind=${kind}` : ''
  return djangoLearn<{ exams: DjangoExam[] }>(event, 'GET', `/api/learn/exams/${q}`)
})
