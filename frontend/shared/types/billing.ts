/** Order statuses as the Django backend reports them */
export type OrderStatus = 'pending' | 'paid' | 'failed' | 'cancelled' | 'expired' | 'refunded'

/**
 * Access states. ACTIVATING = paid and dated, but the backend hasn't switched the access on yet (it does that a
 * moment after the payment); EXPIRED = the end date has really passed.
 */
export const SUB = { ACTIVE: 'active', ENDS_SOON: 'ends_soon', ACTIVATING: 'activating', EXPIRED: 'expired' } as const
export type SubscriptionState = (typeof SUB)[keyof typeof SUB]
/** Whether the learner can study now */
export const canLearn = (state: SubscriptionState | null | undefined) => state === SUB.ACTIVE || state === SUB.ENDS_SOON

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
