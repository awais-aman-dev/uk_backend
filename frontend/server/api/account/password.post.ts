import { passwordChangeSchema } from '#shared/schemas/auth'

// Django signs every session out when the password changes (it revokes all refresh tokens). Other
// devices should be signed out; this one shouldn't — so we sign in again with the new password and
// keep the session length the user chose ("remember me" travels on the old refresh token).
export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const remember = jwtPayload(refreshTokenOf(event) ?? '').remember_me !== false
  const input = await readValidated(event, passwordChangeSchema)
  const res = await djangoFetch<{ detail?: string }>(event, 'POST', '/api/cabinet/password/change/', {
    auth: true,
    body: { current_password: input.currentPassword, password: input.password, confirm_password: input.confirmPassword }
  })
  if (!res.ok) {
    // Django reports a wrong current password as a form-level 400 — show it on that field
    if (res.status === 400 && /current password/i.test(res.data?.detail ?? '')) throw fieldError(400, { currentPassword: 'That password is incorrect' })
    throwDjangoError(res)
  }
  const login = await djangoFetch<{ access: string; refresh: string }>(event, 'POST', '/api/auth/login/', {
    body: { email: user.email, password: input.password, remember_me: remember }
  })
  if (login.ok) setTokens(event, login.data)
  else clearTokens(event)
  return { ok: true, signedOut: !login.ok }
})
