import type { H3Event } from 'h3'

/*
 * The Django backend (accounts, packages, payments, cabinet), reached through this server.
 *
 * The browser never sees a JWT: the token pair lives in httpOnly cookies set here, and this
 * server attaches `Authorization: Bearer` when it calls Django. Access tokens last 5 minutes, so
 * a 401 triggers one refresh (Django rotates the refresh token and blacklists the old one) and a
 * retry. Concurrent refreshes of the same token share one call, because a second refresh with
 * the already-rotated token would be rejected and sign the user out.
 */

const ACCESS = 'dj_at'
const REFRESH = 'dj_rt'
/** Refresh the 5-minute access token once it has less than this left (> the 60 s heartbeat interval) */
const REFRESH_AHEAD_S = 75

export interface DjangoResponse<T> {
  status: number
  ok: boolean
  data: T
}

interface TokenPair {
  access: string
  refresh: string
}

const baseUrl = () => useRuntimeConfig().djangoApiUrl.replace(/\/$/, '')

/** JWT payload, without verifying it — Django verifies every token it is given. */
export function jwtPayload(token: string): Record<string, unknown> {
  try {
    return JSON.parse(Buffer.from(token.split('.')[1] ?? '', 'base64url').toString('utf8'))
  } catch {
    return {}
  }
}

const secondsLeft = (token: string) => {
  const exp = Number(jwtPayload(token).exp ?? 0)
  return exp - Math.floor(Date.now() / 1000)
}

export function setTokens(event: H3Event, pair: TokenPair) {
  const opts = { httpOnly: true, secure: !import.meta.dev, sameSite: 'lax' as const, path: '/' }
  setCookie(event, ACCESS, pair.access, { ...opts, maxAge: Math.max(60, secondsLeft(pair.access)) })
  // The refresh token decides how long the user stays signed in (24 h, or 30 days with "remember me")
  setCookie(event, REFRESH, pair.refresh, { ...opts, maxAge: Math.max(60, secondsLeft(pair.refresh)) })
  event.context.djangoTokens = pair
}

export function clearTokens(event: H3Event) {
  deleteCookie(event, ACCESS, { path: '/' })
  deleteCookie(event, REFRESH, { path: '/' })
  event.context.djangoTokens = null
}

const tokensOf = (event: H3Event): Partial<TokenPair> | null => {
  if (event.context.djangoTokens !== undefined) return event.context.djangoTokens
  const access = getCookie(event, ACCESS)
  const refresh = getCookie(event, REFRESH)
  return access || refresh ? { access, refresh } : null
}

/**
 * In-flight refreshes by refresh token, remembered a few seconds after they finish, so requests from the
 * same page that arrive a moment later get the new pair instead of being refused for the rotated token.
 * Kept short: for that window the old refresh token still yields the session.
 */
const REUSE_MS = 5_000
const refreshing = new Map<string, { promise: Promise<TokenPair | null>; at: number }>()

async function refreshPair(refresh: string): Promise<TokenPair | null> {
  const now = Date.now()
  for (const [k, v] of refreshing) if (now - v.at > REUSE_MS) refreshing.delete(k)
  const known = refreshing.get(refresh)
  if (known) return known.promise
  const promise = (async () => {
    const res = await rawFetch<TokenPair>('POST', '/api/auth/token/refresh/', { refresh })
    return res.ok ? res.data : null
  })()
  refreshing.set(refresh, { promise, at: now })
  return promise
}

/** A sleeping free Render instance takes up to ~60 s to wake; a page waits for it rather than failing */
const TIMEOUT_MS = 50_000

async function rawFetch<T>(method: string, path: string, body?: unknown, headers: Record<string, string> = {}): Promise<DjangoResponse<T>> {
  let res: Response
  try {
    res = await fetch(baseUrl() + path, {
      method,
      headers: { accept: 'application/json', ...(body !== undefined ? { 'content-type': 'application/json' } : {}), ...headers },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(TIMEOUT_MS)
    })
  } catch {
    throw createError({ statusCode: 503, statusMessage: 'The account service is unavailable. Please try again in a moment.' })
  }
  const text = await res.text()
  let data: unknown = null
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    data = { detail: res.status >= 500 ? 'Something went wrong on our side.' : 'Unexpected response.' }
  }
  return { status: res.status, ok: res.ok, data: data as T }
}

/**
 * Calls Django. With `auth`, attaches the signed-in user's access token, refreshing it first when it
 * is about to expire, and once more on a 401. The client's IP is forwarded so Django's per-IP rate
 * limits and login lockouts apply to each visitor, not to this server.
 */
export async function djangoFetch<T>(event: H3Event, method: string, path: string, opts: { body?: unknown; auth?: boolean } = {}): Promise<DjangoResponse<T>> {
  const ip = getRequestIP(event, { xForwardedFor: true })
  const headers: Record<string, string> = ip ? { 'x-forwarded-for': ip } : {}
  if (!opts.auth) return rawFetch<T>(method, path, opts.body, headers)

  let tokens = tokensOf(event)
  if (!tokens?.access && !tokens?.refresh) return { status: 401, ok: false, data: { detail: 'Please log in' } as T }

  const renew = async () => {
    const pair = tokens?.refresh ? await refreshPair(tokens.refresh) : null
    if (!pair) {
      // Only a page load clears the cookies. Parallel API calls can race to refresh the same token on
      // different server instances: the loser must not delete the cookies the winner has just set.
      if (!event.path.startsWith('/api/')) clearTokens(event)
      return false
    }
    setTokens(event, pair)
    tokens = pair
    return true
  }
  // Refresh ahead of expiry; the once-a-minute heartbeat from an open tab usually does it alone,
  // before several parallel requests could run into an expired token at the same moment
  if (!tokens.access || secondsLeft(tokens.access) < REFRESH_AHEAD_S) {
    if (!(await renew())) return { status: 401, ok: false, data: { detail: 'Please log in' } as T }
  }
  let res = await rawFetch<T>(method, path, opts.body, { ...headers, authorization: `Bearer ${tokens.access}` })
  if (res.status === 401 && (await renew())) {
    res = await rawFetch<T>(method, path, opts.body, { ...headers, authorization: `Bearer ${tokens.access}` })
  }
  return res
}

/** The refresh token of this visitor (to blacklist it on logout). */
export const refreshTokenOf = (event: H3Event) => tokensOf(event)?.refresh ?? null

/* ---------- Errors: Django/DRF → the shape our forms show ---------- */

/** DRF field names → our form field names */
const FIELD: Record<string, string> = {
  first_name: 'firstName',
  last_name: 'lastName',
  confirm_password: 'confirmPassword',
  current_password: 'currentPassword',
  new_email: 'email',
  package_id: 'form',
  promo_code: 'promoCode',
  non_field_errors: 'form',
  detail: 'form'
}

/**
 * Throws a Django error response as our API error: field messages go to `data.fieldErrors`
 * (first message per field), `detail` becomes the form-level message; 429 / 5xx get friendly text.
 */
export function throwDjangoError(res: DjangoResponse<unknown>, fallback = 'Please check the form'): never {
  const body = (res.data ?? {}) as Record<string, unknown>
  if (res.status === 429) {
    const wait = String(body.detail ?? '').match(/(\d+) seconds?/)?.[1]
    throw fieldError(429, { form: `Too many attempts. Please try again${wait ? ` in ${wait} seconds` : ' later'}.` }, 'Too many attempts')
  }
  if (res.status >= 500) throw createError({ statusCode: 502, statusMessage: String(body.detail ?? 'The account service had a problem. Please try again.') })
  const fieldErrors: Record<string, string> = {}
  for (const [key, value] of Object.entries(body)) {
    const message = Array.isArray(value) ? value[0] : value
    if (typeof message === 'string') fieldErrors[FIELD[key] ?? key] = message
  }
  const statusMessage = fieldErrors.form ?? fallback
  throw createError({ statusCode: res.status, statusMessage, data: { fieldErrors } })
}

declare module 'h3' {
  interface H3EventContext {
    djangoTokens?: TokenPair | null
  }
}
