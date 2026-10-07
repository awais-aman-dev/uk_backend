import type { H3Event } from 'h3'
import { createHash } from 'node:crypto'
import type { SessionUser } from '#shared/types/auth'

/*
 * Who is signed in — answered by the Django backend, which owns accounts and access.
 *
 * The user is the Django profile behind the token cookies (see django.ts). For the learning area,
 * which runs on this server until its Django version exists, each Django account has a local learner
 * row (users.django_id) holding progress; SessionUser.id is that local id.
 *
 * Answers are cached for a few seconds so a page that makes several API calls doesn't ask Django the
 * same question each time. The profile is cached by a hash of the access token — a token Django has
 * already accepted — never by the user id inside the token, which isn't verified here.
 */

export interface DjangoProfile {
  email: string
  first_name: string
  last_name: string
  phone: string
  has_google_auth: boolean
  email_verified: boolean
}

export interface DjangoSubscription {
  has_subscription: boolean
  package_name: string | null
  package_expires_at: string | null
  account_expires_at: string | null
  status: string | null
  online_platform_activated: boolean
  purchase_date: string | null
  days_remaining: number | null
}

interface Known {
  profile: DjangoProfile
  djangoId: string
  learnerId: number
}

const TTL = 20_000
const byToken = new Map<string, { at: number; value: Known }>()
const subs = new Map<string, { at: number; value: DjangoSubscription | null }>()
const fresh = <T>(entry: { at: number; value: T } | undefined) => (entry && Date.now() - entry.at < TTL ? entry : undefined)
const prune = <T>(map: Map<string, { at: number; value: T }>) => {
  if (map.size > 2000) for (const [k, v] of map) if (Date.now() - v.at > TTL) map.delete(k)
}
const tokenKey = (access: string) => createHash('sha256').update(access).digest('base64url')

/** Drop cached answers about this visitor (after a profile change, a payment, or sign-out). */
export function forgetCached(event: H3Event) {
  const id = event.context.auth?.djangoId
  if (!id) return
  subs.delete(id)
  for (const [k, v] of byToken) if (v.value.djangoId === id) byToken.delete(k)
}

const fullName = (p: DjangoProfile) => [p.first_name, p.last_name].filter(Boolean).join(' ') || p.email

/** Local learner row for a Django account: created on first sight, name and email kept in step. */
async function learnerFor(djangoId: string, profile: DjangoProfile) {
  const db = await useDb()
  const name = fullName(profile)
  const [row] = await db
    .insert(schema.users)
    .values({ djangoId, name, email: profile.email })
    .onConflictDoUpdate({ target: schema.users.djangoId, set: { name, email: profile.email } })
    .returning({ id: schema.users.id })
  return row!.id
}

/** The signed-in user (memoised per request), or null. Never throws: if Django can't be reached, nobody is signed in. */
export async function getSessionUser(event: H3Event): Promise<SessionUser | null> {
  if (event.context.auth) return event.context.auth.user
  const signedOut = () => {
    event.context.auth = { user: null, djangoId: null, profile: null }
    return null
  }
  try {
    const access = event.context.djangoTokens?.access ?? getCookie(event, 'dj_at')
    let known = access ? fresh(byToken.get(tokenKey(access)))?.value : undefined
    if (!known) {
      const res = await djangoFetch<DjangoProfile>(event, 'GET', '/api/cabinet/profile/', { auth: true })
      if (!res.ok) return signedOut()
      // The token Django just accepted (it may have been refreshed during the call)
      const used = event.context.djangoTokens?.access ?? access ?? ''
      const djangoId = String(jwtPayload(used).user_id ?? '')
      if (!djangoId) return signedOut()
      known = { profile: res.data, djangoId, learnerId: await learnerFor(djangoId, res.data) }
      byToken.set(tokenKey(used), { at: Date.now(), value: known })
      prune(byToken)
    }
    const user: SessionUser = { id: known.learnerId, name: fullName(known.profile), email: known.profile.email, role: 'learner' }
    event.context.auth = { user, djangoId: known.djangoId, profile: known.profile }
    return user
  } catch {
    return signedOut()
  }
}

/** The Django profile of the signed-in user (after getSessionUser). */
export async function getProfile(event: H3Event) {
  await getSessionUser(event)
  return event.context.auth?.profile ?? null
}

/**
 * Access status from Django. Only an *active* plan is cached briefly: "no plan / expired" can turn into access at
 * any moment (a payment), and the server instance that handled the payment isn't the one serving the next page.
 */
export async function getSubscription(event: H3Event): Promise<DjangoSubscription | null> {
  const user = await getSessionUser(event)
  if (!user) return null
  const id = event.context.auth!.djangoId!
  const hit = fresh(subs.get(id))
  if (hit) return hit.value
  const res = await djangoFetch<DjangoSubscription>(event, 'GET', '/api/cabinet/subscription/', { auth: true })
  const value = res.ok ? res.data : null
  if (res.ok && value?.online_platform_activated) {
    subs.set(id, { at: Date.now(), value })
    prune(subs)
  }
  return value
}

export async function requireUser(event: H3Event) {
  const user = await getSessionUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Please log in' })
  return user
}

declare module 'h3' {
  interface H3EventContext {
    auth?: { user: SessionUser | null; djangoId: string | null; profile: DjangoProfile | null }
  }
}
