<script setup lang="ts">
import { formatGBP } from '#shared/money'
import { canLearn, SUB } from '#shared/types/billing'

definePageMeta({ middleware: 'auth' })
useHead({ title: 'My account — 1Theory' })

const { logout } = useAuth()
const toast = useToast()
const { data, refresh } = await useFetch('/api/account')
const route = useRoute()
const router = useRouter()
const { packages } = await usePackages()
const checkout = useCheckout()

const sub = computed(() => data.value?.subscription ?? null)
const hasAccess = computed(() => canLearn(sub.value?.state))
const firstName = computed(() => data.value?.profile.firstName)

// Paid, but the backend hasn't switched the access on yet: either the plan is there and still activating, or
// we came from the payment page (?activating=1) before it even shows. Say so and keep checking (up to 5 minutes).
const cameFromPayment = route.query.activating === '1'
const activating = computed(() => sub.value?.state === SUB.ACTIVATING || (cameFromPayment && !hasAccess.value && sub.value?.state !== SUB.EXPIRED))
let activationTimer: ReturnType<typeof setInterval> | undefined
onMounted(() => {
  if (!activating.value) return
  const started = Date.now()
  activationTimer = setInterval(async () => {
    await refresh()
    if (hasAccess.value) {
      clearInterval(activationTimer)
      toast.show('Your access is active. Enjoy!')
      if (cameFromPayment) router.replace('/account')
    } else if (Date.now() - started > 5 * 60_000) {
      clearInterval(activationTimer)
    }
  }, 5000)
})
onBeforeUnmount(() => clearInterval(activationTimer))

const resending = ref(false)
async function resendVerification() {
  resending.value = true
  try {
    const { message } = await $fetch('/api/account/verify-resend', { method: 'POST' })
    toast.show(message, 'info')
  } catch (e) {
    toast.show(apiErrorsOf(e).form ?? 'Could not send the email', 'error')
  } finally {
    resending.value = false
  }
}

// Share of the current period already used, for the progress bar. Measured in the browser after
// mount: server and client clocks differ by a few ms, which would otherwise mismatch on hydration.
const now = ref<number | null>(null)
onMounted(() => (now.value = Date.now()))
const used = computed(() => {
  if (!sub.value || now.value === null) return 0
  const start = new Date(sub.value.startsAt).getTime()
  const end = new Date(sub.value.endsAt).getTime()
  return Math.min(1, Math.max(0, (now.value - start) / (end - start)))
})
</script>

<template>
  <section class="account">
    <div class="container account__inner">
      <header class="account__head">
        <div>
          <p class="eyebrow">My account</p>
          <h1>Hi, {{ firstName }}.</h1>
        </div>
        <div class="account__actions">
          <NuxtLink to="/account/settings" class="btn btn--ghost btn--sm">Settings</NuxtLink>
          <UiButton variant="ghost" size="sm" @click="logout">Log out</UiButton>
        </div>
      </header>

      <UiAlert v-if="data && !data.profile.emailVerified" variant="info">
        Please confirm your email address — we sent a link to <b>{{ data.profile.email }}</b>.
        <button type="button" class="linklike" :disabled="resending" @click="resendVerification">Send it again</button>
      </UiAlert>

      <!-- Subscription -->
      <div class="sub" :class="activating ? 'sub--activating' : sub ? `sub--${sub.state}` : 'sub--none'">
        <div class="sub__top">
          <div>
            <p class="sub__label">Your access</p>
            <h2>{{ sub ? sub.planName : activating ? 'Your plan' : 'No plan yet' }}</h2>
          </div>
          <StatusBadge :status="activating ? SUB.ACTIVATING : !sub ? 'none' : sub.state === SUB.EXPIRED ? 'sub_expired' : sub.state" />
        </div>

        <!-- paid, access being switched on: no days / dates yet -->
        <p v-if="activating" class="sub__note sub__note--activating" role="status">
          <span class="sub__spinner" aria-hidden="true" />
          Payment received — we’re activating your access. This usually takes a minute or two; this page updates by itself.
        </p>
        <template v-else-if="sub">
          <div class="sub__stats">
            <div>
              <strong>{{ sub.daysLeft }}</strong>
              <span>{{ sub.daysLeft === 1 ? 'day' : 'days' }} left</span>
            </div>
            <div>
              <strong class="sub__date">{{ formatDate(sub.endsAt) }}</strong>
              <span>{{ sub.state === SUB.EXPIRED ? 'ended' : 'access until' }}</span>
            </div>
          </div>
          <div class="sub__bar" aria-hidden="true"><i :style="{ transform: `scaleX(${1 - used})` }" /></div>
          <p v-if="sub.state === SUB.ENDS_SOON" class="sub__note">Your access ends soon — extend now so you don't lose your progress streak.</p>
          <p v-if="sub.state === SUB.EXPIRED" class="sub__note">
            Your access has ended. Pick a plan below to carry on — your progress is saved.
            <template v-if="data?.accountExpiresAt"> Your account stays open until {{ formatDate(data.accountExpiresAt) }}.</template>
          </p>
        </template>
        <p v-else class="sub__note">Choose a plan to unlock lessons, mock tests and hazard perception.</p>

        <div class="sub__actions">
          <NuxtLink v-if="hasAccess" to="/learn" class="btn btn--primary btn--lg">
            Start learning <span class="arrow" aria-hidden="true">→</span>
          </NuxtLink>
          <button v-else-if="activating" type="button" class="btn btn--primary btn--lg" disabled>
            Start learning <span class="arrow" aria-hidden="true">→</span>
          </button>
        </div>
      </div>

      <!-- Extend / buy -->
      <div v-if="!activating" class="extend">
        <h2>{{ hasAccess ? 'Extend your access' : 'Choose a plan' }}</h2>
        <p v-if="hasAccess" class="muted">New days are added after your current access ends — you never lose time.</p>
        <UiAlert v-if="checkout.error.value">{{ checkout.error.value }}</UiAlert>
        <div class="extend__plans">
          <button
            v-for="p in packages"
            :key="p.slug"
            type="button"
            class="extend__plan"
            :class="{ 'is-rec': p.featured }"
            :disabled="!!checkout.starting.value"
            @click="checkout.start(p.slug)"
          >
            <span>{{ hasAccess ? `+${p.days} days` : p.name }}</span>
            <strong>{{ checkout.starting.value === p.slug ? '…' : formatGBP(p.pricePence) }}</strong>
          </button>
        </div>
        <p class="muted small">You’ll pay securely on Stripe. Receipts are emailed to you.</p>
      </div>
      <!-- Order history: waiting for the backend's orders endpoint (agreed with the backend team) -->
    </div>
  </section>
</template>

<style scoped>
.account { padding: 24px 0 88px; }
@media (min-width: 900px) { .account { padding-top: 40px; } }
.account__inner { display: grid; gap: 20px; max-width: 880px; }
.account__head { display: flex; justify-content: space-between; align-items: flex-end; gap: 16px; }
.account__actions { display: flex; gap: 8px; }
.linklike { padding: 0; border: 0; background: none; color: var(--accent); font: inherit; font-weight: 500; cursor: pointer; }
.small { font-size: 0.8125rem; margin-top: 8px; }
.account__head .eyebrow { margin-bottom: 6px; }
h1 { font-size: clamp(2.25rem, 5vw, 3rem); }
h2 { font-size: 1.5rem; }
.muted { color: var(--muted); }

/* Access card — dark, with a soft colour glow like a wallet card */
.sub {
  position: relative;
  overflow: hidden;
  display: grid;
  gap: 18px;
  padding: 26px;
  border-radius: var(--radius-xl);
  background: var(--black);
  color: #f5f5f7;
  isolation: isolate;
}
.sub::before {
  content: '';
  position: absolute;
  z-index: -1;
  inset: -40% -20% auto auto;
  width: 520px;
  height: 520px;
  border-radius: 50%;
  background: radial-gradient(closest-side, rgb(41 151 255 / 0.45), rgb(162 89 255 / 0.2) 55%, transparent);
}
.sub--ends_soon::before { background: radial-gradient(closest-side, rgb(255 159 10 / 0.45), transparent); }
.sub--expired::before, .sub--none::before { background: radial-gradient(closest-side, rgb(142 142 147 / 0.35), transparent); }
@media (min-width: 600px) { .sub { padding: 34px; } }
.sub__top { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; }
.sub__label { font-size: 0.875rem; font-weight: 500; color: var(--muted-dark); }
.sub__top h2 { font-size: 2.25rem; margin-top: 4px; }
.sub__stats { display: flex; flex-wrap: wrap; gap: 36px; }
.sub__stats div { display: grid; }
.sub__stats strong { font-family: var(--font-display); font-size: 3.25rem; font-weight: 600; line-height: 1; letter-spacing: -0.04em; }
.sub__stats .sub__date { font-size: 1.75rem; line-height: 1.85; letter-spacing: -0.02em; }
.sub__stats span { color: var(--muted-dark); font-size: 0.9375rem; }
.sub__bar { height: 6px; border-radius: 3px; background: rgb(255 255 255 / 0.12); overflow: hidden; }
.sub__bar i { display: block; height: 100%; border-radius: 3px; background: linear-gradient(90deg, #30d158, #2997ff); transform-origin: left; transition: transform 1s var(--ease); }
.sub--ends_soon .sub__bar i { background: var(--warn); }
.sub__note { color: var(--muted-dark); }
.sub__note--activating { display: flex; align-items: center; gap: 12px; margin: 6px 0 4px; color: #f5f5f7; }
.sub__spinner { flex: none; width: 20px; height: 20px; border-radius: 50%; border: 2.5px solid rgb(255 255 255 / 0.25); border-top-color: #2997ff; animation: sub-spin 0.9s linear infinite; }
@keyframes sub-spin { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) { .sub__spinner { animation-duration: 3s; } }
.sub__actions:empty { display: none; }

.extend { display: grid; gap: 12px; padding: 26px; border-radius: var(--radius-lg); background: var(--card); box-shadow: var(--shadow); }
.extend__plans { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
.extend__plan {
  display: grid;
  gap: 2px;
  padding: 16px;
  border: 0;
  border-radius: 18px;
  background: var(--paper);
  text-align: left;
  transition: transform 0.4s var(--spring), box-shadow 0.3s, background-color 0.3s;
}
.extend__plan:not(:disabled):hover { transform: translateY(-2px); background: #fff; box-shadow: var(--shadow-lg); }
.extend__plan.is-rec { box-shadow: inset 0 0 0 1.5px var(--accent); }
.extend__plan:disabled { opacity: 0.6; cursor: progress; }
.extend__plan span { font-size: 0.875rem; color: var(--muted); }
.extend__plan strong { font-size: 1.5rem; font-weight: 600; letter-spacing: -0.02em; }

.orders { display: grid; gap: 12px; margin-top: 8px; }
.orders__table { border-radius: var(--radius-lg); background: var(--card); box-shadow: var(--shadow); overflow: hidden; }
.orders__row {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 4px 16px;
  align-items: center;
  padding: 14px 18px;
  border-bottom: 1px solid var(--line-soft);
}
.orders__row:last-child { border-bottom: 0; }
.orders__row--head { display: none; }
.orders__id { font-weight: 600; }
.orders__status { display: flex; gap: 10px; align-items: center; justify-content: flex-end; }
@media (max-width: 699px) {
  .orders__row > :nth-child(2) { grid-column: 2; color: var(--muted); font-size: 0.875rem; }
  .orders__row > :nth-child(3) { grid-column: 1 / 3; }
  .orders__row > :nth-child(4) { grid-row: 1; grid-column: 3; font-weight: 500; }
  .orders__row > :nth-child(5) { grid-column: 3; grid-row: 2; }
}
@media (min-width: 700px) {
  .orders__row { grid-template-columns: 80px 1fr 1fr 90px 190px; }
  .orders__row--head { display: grid; font-size: 0.8125rem; font-weight: 500; color: var(--muted); background: var(--paper); }
  .orders__row--head > :last-child { text-align: right; }
}
</style>
