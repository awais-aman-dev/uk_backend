import { z } from 'zod'

// Start paying for a package. Django creates a pending order and a Stripe Checkout Session; the
// browser is sent to Stripe. The order turns paid only when Stripe's signed webhook reaches Django.
// Django's checkout is built for guests, so we pass the signed-in learner's email and name.
export default defineEventHandler(async (event) => {
  await requireUser(event)
  const profile = (await getProfile(event))!
  const { plan, promoCode } = await readValidated(event, z.object({ plan: z.string().min(1).max(60), promoCode: z.string().trim().max(50).optional() }))
  const pkg = (await listPackages(event)).find((p) => p.slug === plan)
  if (!pkg) throw fieldError(404, { form: 'This package is not available any more.' }, 'Package not found')

  const res = await djangoFetch<{ session_url: string; order_id: string }>(event, 'POST', '/api/payments/checkout/', {
    body: { package_id: pkg.id, email: profile.email, first_name: profile.first_name, last_name: profile.last_name, promo_code: promoCode ?? '' }
  })
  if (!res.ok) throwDjangoError(res, 'Could not start the payment')
  return { url: res.data.session_url, orderId: res.data.order_id }
})
