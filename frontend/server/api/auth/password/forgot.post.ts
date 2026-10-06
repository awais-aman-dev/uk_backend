import { forgotPasswordSchema } from '#shared/schemas/auth'

// Asks Django to email a reset link (to /auth/reset-password?token=…). Same answer whether or not the
// email is registered, so the form can't be used to find out who has an account.
export default defineEventHandler(async (event) => {
  const { email } = await readValidated(event, forgotPasswordSchema)
  const res = await djangoFetch(event, 'POST', '/api/auth/password/reset/', { body: { email } })
  if (!res.ok) throwDjangoError(res)
  return { ok: true }
})
