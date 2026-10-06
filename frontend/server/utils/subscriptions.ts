import { ENDS_SOON_DAYS, type SubscriptionDto } from '#shared/types/billing'
import type { DjangoSubscription } from './session'

const DAY = 86_400_000

/** Django's cabinet subscription → the shape the frontend already renders (null if never bought). */
export function subscriptionFromDjango(sub: DjangoSubscription | null): SubscriptionDto | null {
  if (!sub?.has_subscription || !sub.package_expires_at) return null
  const endsAt = new Date(sub.package_expires_at)
  const msLeft = endsAt.getTime() - Date.now()
  const daysLeft = Math.max(0, Math.ceil(msLeft / DAY))
  const name = sub.package_name ?? 'Plan'
  return {
    plan: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    planName: name,
    startsAt: sub.purchase_date ?? endsAt.toISOString(),
    endsAt: endsAt.toISOString(),
    daysLeft,
    state: !sub.online_platform_activated || msLeft <= 0 ? 'expired' : daysLeft <= ENDS_SOON_DAYS ? 'ends_soon' : 'active'
  }
}
