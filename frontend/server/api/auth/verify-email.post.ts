import { z } from 'zod'

// Confirms an email address from Django's links:
//   kind "signup" → /auth/verify-email?token=…  (after registration)
//   kind "change" → /account/email/confirm?token=…  (new address after an email change)
export default defineEventHandler(async (event) => {
  const { token, kind } = await readValidated(event, z.object({ token: z.string().min(1).max(500), kind: z.enum(['signup', 'change']) }))
  const path = kind === 'signup' ? '/api/auth/email/verify/' : '/api/cabinet/email/change/confirm/'
  const res = await djangoFetch<{ detail: string }>(event, 'GET', `${path}?token=${encodeURIComponent(token)}`)
  if (!res.ok) throwDjangoError(res, 'This link is invalid or has expired')
  forgetCached(event)
  return { message: res.data.detail }
})
