import { z } from 'zod'
import type { DjangoExamResult } from '#shared/types/learn'

// Submit a whole exam once (guide §14): answers keyed by question id (as strings) → option ids.
// Django marks it; missing answers count as wrong and `{}` is valid.
export default defineEventHandler(async (event) => {
  const { answers } = await readValidated(event, z.object({ answers: z.record(z.string().regex(/^\d+$/), z.array(z.string().max(8)).max(8)) }))
  return djangoLearn<DjangoExamResult>(event, 'POST', `/api/learn/exams/${encodeURIComponent(getRouterParam(event, 'slug')!)}/submit/`, { answers })
})
