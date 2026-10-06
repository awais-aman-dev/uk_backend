/** Order statuses as the Django backend reports them */
export type OrderStatus = 'pending' | 'paid' | 'failed' | 'cancelled' | 'expired' | 'refunded'

export type SubscriptionState = 'active' | 'ends_soon' | 'expired'

/** "Ends soon" threshold, in days */
export const ENDS_SOON_DAYS = 3

export interface SubscriptionDto {
  plan: string
  planName: string
  startsAt: string
  endsAt: string
  daysLeft: number
  state: SubscriptionState
}
