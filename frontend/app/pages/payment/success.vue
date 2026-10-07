<script setup lang="ts">
import { formatGBP } from '#shared/money'

// Stripe sends the learner here after paying. The order turns paid only when Stripe's webhook reaches
// the backend (usually a second or two), so we poll until then.
definePageMeta({ middleware: 'auth' })
useHead({ title: 'Payment — 1Theory' })

const route = useRoute()
const toast = useToast()
const orderId = String(route.query.order_id ?? '')

type Order = { id: string; status: string; packageName: string; days: number; pricePence: number; paidAt: string | null }
const order = ref<Order | null>(null)
const failed = ref<string>()
const waitedTooLong = ref(false)

let timer: ReturnType<typeof setTimeout> | undefined
let tries = 0
async function poll() {
  try {
    const res = await $fetch<{ order: Order }>(`/api/checkout/orders/${orderId}` as string)
    order.value = res.order
    if (res.order.status === 'paid') return waitForAccess()
    if (res.order.status !== 'pending') return
  } catch (e) {
    failed.value = apiErrorsOf(e).form ?? 'We couldn’t find this order.'
    return
  }
  tries++
  if (tries > 20) waitedTooLong.value = true
  // ~1.5 s at first, then every 4 s, and stop after about 3 minutes (the email confirms it anyway)
  if (tries < 50) timer = setTimeout(poll, tries < 10 ? 1500 : 4000)
}
// The backend marks the order paid a moment before it grants the access (that part runs in the background),
// so don't say "active" until the account really shows it — then go to the account.
const activating = ref(false)
async function waitForAccess() {
  activating.value = true
  for (let i = 0; i < 60; i++) { // up to ~2 minutes: the backend has been seen granting access a minute after "paid"
    const acct = await $fetch<{ subscription: { state: string } | null }>('/api/account').catch(() => null)
    const state = acct?.subscription?.state
    if (state === 'active' || state === 'ends_soon') {
      toast.show('Payment successful! Your access is active.')
      return navigateTo('/account', { replace: true })
    }
    await new Promise((r) => (timer = setTimeout(r, 2000)))
  }
  // still not there: the account page says it's being activated and keeps checking
  return navigateTo({ path: '/account', query: { activating: '1' } }, { replace: true })
}

onMounted(poll)
onBeforeUnmount(() => clearTimeout(timer))
</script>

<template>
  <section class="pay">
    <div class="container">
      <div class="card">
        <template v-if="failed">
          <h1>Something’s not right</h1>
          <p class="lead">{{ failed }}</p>
          <NuxtLink to="/account" class="btn btn--primary">Go to my account</NuxtLink>
        </template>
        <template v-else-if="order && order.status !== 'pending' && order.status !== 'paid'">
          <h1>Payment didn’t go through</h1>
          <p class="lead">Your {{ order.packageName }} order is {{ order.status }}. No money was taken.</p>
          <NuxtLink to="/#pricing" class="btn btn--primary">Choose a plan again</NuxtLink>
        </template>
        <template v-else>
          <span class="spinner" aria-hidden="true" />
          <h1>{{ activating ? 'Payment received — activating your access…' : 'Confirming your payment…' }}</h1>
          <p class="lead">
            <template v-if="order">{{ order.packageName }} · {{ order.days }} days · {{ formatGBP(order.pricePence) }}. </template>
            This usually takes a few seconds.
          </p>
          <p v-if="waitedTooLong" class="note">
            Still waiting for the bank. You can close this page — your access starts as soon as the payment is confirmed,
            and we’ll email you. <NuxtLink to="/account">Go to my account</NuxtLink>
          </p>
        </template>
      </div>
    </div>
  </section>
</template>

<style scoped>
.pay { padding: 40px 0 96px; }
.card { display: grid; justify-items: center; gap: 14px; max-width: 520px; margin: 0 auto; padding: 40px 28px; border-radius: var(--radius-lg); background: var(--card); box-shadow: var(--shadow); text-align: center; }
.card h1 { font-size: clamp(1.5rem, 3.5vw, 1.875rem); }
.lead { color: var(--muted); }
.note { font-size: 0.875rem; color: var(--muted); }
.spinner { width: 40px; height: 40px; border-radius: 50%; border: 3px solid var(--accent-soft); border-top-color: var(--accent); animation: spin 0.9s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) { .spinner { animation-duration: 3s; } }
</style>
