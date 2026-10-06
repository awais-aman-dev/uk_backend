// Sign out: Django blacklists the refresh token, and the cookies are cleared here either way.
export default defineEventHandler(async (event) => {
  const refresh = refreshTokenOf(event)
  if (refresh) await djangoFetch(event, 'POST', '/api/auth/logout/', { auth: true, body: { refresh } }).catch(() => null)
  forgetCached(event)
  clearTokens(event)
  return { ok: true }
})
