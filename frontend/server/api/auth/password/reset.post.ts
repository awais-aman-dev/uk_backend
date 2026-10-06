import { resetPasswordSchema } from '#shared/schemas/auth'

// Sets a new password from an emailed link (also used to set a first password after a guest purchase).
export default defineEventHandler(async (event) => {
  const input = await readValidated(event, resetPasswordSchema)
  const res = await djangoFetch(event, 'POST', '/api/auth/password/reset/confirm/', {
    body: { token: input.token, password: input.password, confirm_password: input.confirmPassword }
  })
  if (!res.ok) throwDjangoError(res, 'This link is invalid or has expired')
  return { ok: true }
})
