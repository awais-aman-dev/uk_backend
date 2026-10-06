import type { H3Event } from 'h3'
import { z } from 'zod'

/** Field → first message, for showing next to inputs. */
export const fieldErrorsOf = (error: z.ZodError) => {
  const out: Record<string, string> = {}
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? 'form')
    out[key] ??= issue.message
  }
  return out
}

export const fieldError = (statusCode: number, fieldErrors: Record<string, string>, message = 'Please check the form') =>
  createError({ statusCode, statusMessage: message, data: { fieldErrors } })

export async function readValidated<T extends z.ZodType>(event: H3Event, schema: T): Promise<z.infer<T>> {
  const body = await readBody(event).catch(() => undefined)
  const result = schema.safeParse(body)
  if (!result.success) throw fieldError(422, fieldErrorsOf(result.error))
  return result.data
}
