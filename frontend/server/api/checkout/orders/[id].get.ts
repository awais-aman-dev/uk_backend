import type { OrderStatus } from '#shared/types/billing'
import { poundsToPence } from '#shared/money'

// Status of one of my orders, polled by /payment/success until Stripe's webhook marks it paid.
// Django's order endpoint is open to anyone with the id; here it only answers the order's owner.
interface DjangoOrder {
  id: string
  status: OrderStatus
  email: string
  package_name: string
  package_duration_days: number
  original_price: string
  discount_amount: string
  final_price: string
  paid_at: string | null
  created_at: string
}

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const id = getRouterParam(event, 'id') ?? ''
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw createError({ statusCode: 404, statusMessage: 'Order not found' })
  const res = await djangoFetch<DjangoOrder>(event, 'GET', `/api/payments/orders/${id}/`)
  if (!res.ok || res.data.email.toLowerCase() !== user.email.toLowerCase()) throw createError({ statusCode: 404, statusMessage: 'Order not found' })
  // Access may have just been granted — make the next access check ask Django again
  if (res.data.status === 'paid') forgetCached(event)
  const o = res.data
  return {
    order: {
      id: o.id,
      status: o.status,
      packageName: o.package_name,
      days: o.package_duration_days,
      pricePence: poundsToPence(o.final_price),
      discountPence: poundsToPence(o.discount_amount),
      paidAt: o.paid_at,
      createdAt: o.created_at
    }
  }
})
