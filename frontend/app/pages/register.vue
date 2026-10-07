<script setup lang="ts">
import { formatGBP } from '#shared/money'
import { registerSchema } from '#shared/schemas/auth'

useHead({ title: 'Create your account — 1Theory' })

const route = useRoute()
const { user, register, logout } = useAuth()
const { packages, find, featured } = await usePackages()

const plan = ref<string>(find(route.query.plan)?.slug ?? featured.value?.slug ?? '')
const selected = computed(() => find(plan.value))
const planOptions = computed(() =>
  packages.value.map((p) => ({ value: p.slug, label: p.name, sub: formatGBP(p.pricePence), tag: p.featured ? 'Popular' : undefined }))
)

const { values, errors, pending, validateField, handleSubmit } = useZodForm(registerSchema, {
  firstName: '',
  email: typeof route.query.email === 'string' ? route.query.email : '',
  password: '',
  confirmPassword: '',
  terms: false,
  plan: plan.value
})
// Keep the form and the URL in sync, so refresh / back keeps the chosen package
watch(plan, (p) => {
  values.plan = p
  navigateTo({ query: { ...route.query, plan: p } }, { replace: true })
})

const emailTaken = computed(() => errors.value.email?.includes('already exists'))

// Set once sign-up succeeds, so the "already signed in" card doesn't flash while we go to Stripe
const registered = ref(false)
const onSubmit = handleSubmit(async (data) => {
  await register(data)
  registered.value = true
  if (data.plan) return startCheckout(data.plan)
  await navigateTo('/account')
})

// Already signed in: skip the form, just pay for the chosen package
const checkout = useCheckout()
</script>

<template>
  <section class="auth">
    <div class="container auth__grid">
      <div class="auth__main">
        <FunnelTop :step="1" />

        <UiSegmented v-if="planOptions.length" v-model="plan" label="Your plan" :options="planOptions" class="plan-picker" />

        <!-- Signed in already -->
        <div v-if="user && !registered" class="card">
          <h1>You're signed in</h1>
          <p class="lead">
            As <strong>{{ user.name }}</strong> ({{ user.email }}). Continue to pay for
            <strong>{{ selected?.name }}</strong>.
          </p>
          <UiAlert v-if="checkout.error.value">{{ checkout.error.value }}</UiAlert>
          <UiButton variant="primary" size="lg" block :loading="!!checkout.starting.value" :disabled="!selected" @click="checkout.start(plan)">
            Continue to payment <span class="arrow" aria-hidden="true">→</span>
          </UiButton>
          <p class="muted">Not you? <button type="button" class="linklike" @click="logout">Log out</button></p>
        </div>

        <!-- Sign-up form -->
        <div v-else class="card">
          <h1>Create your account</h1>
          <p class="lead">
            Already have one?
            <NuxtLink :to="{ path: '/login', query: { plan } }" class="form-link">Log in</NuxtLink>
          </p>

          <form class="form" method="post" novalidate @submit.prevent="onSubmit">
            <UiAlert v-if="errors.form">{{ errors.form }}</UiAlert>

            <UiInput
              v-model="values.firstName"
              label="First name"
              autocomplete="given-name"
              :error="errors.firstName"
              required
              @blur="validateField('firstName')"
            />
            <UiInput
              v-model="values.email"
              label="Email"
              type="email"
              inputmode="email"
              autocomplete="email"
              :error="errors.email"
              required
              @blur="validateField('email')"
            >
              <template v-if="emailTaken" #error>
                An account with this email already exists.
                <NuxtLink :to="{ path: '/login', query: { email: values.email, plan } }">Log in instead</NuxtLink>
              </template>
            </UiInput>
            <UiPasswordInput
              v-model="values.password"
              label="Create a password"
              autocomplete="new-password"
              show-rules
              :error="errors.password"
              @blur="validateField('password')"
            />
            <UiPasswordInput
              v-model="values.confirmPassword"
              label="Repeat password"
              autocomplete="new-password"
              :error="errors.confirmPassword"
              @blur="validateField('confirmPassword')"
            />
            <UiCheckbox v-model="values.terms" :error="errors.terms" @change="validateField('terms')">
              I agree to the <NuxtLink to="/terms" target="_blank">Terms of use</NuxtLink> and
              <NuxtLink to="/privacy" target="_blank">Privacy policy</NuxtLink>.
            </UiCheckbox>

            <UiButton type="submit" variant="primary" size="lg" block :loading="pending">
              Continue to payment <span class="arrow" aria-hidden="true">→</span>
            </UiButton>
          </form>
        </div>
      </div>

      <OrderSummary
        v-if="selected"
        label="Order summary"
        :title="selected.name"
        :subtitle="`${selected.days} days full access`"
        :price="formatGBP(selected.pricePence)"
        :features="selected.materials"
        note="One-off payment · no auto-renewal. You'll pay securely on Stripe (test mode)."
      />
    </div>
  </section>
</template>

<style scoped>
.auth { padding: 12px 0 72px; }
.auth__grid { display: grid; grid-template-columns: minmax(0, 1fr); gap: 24px; max-width: 1040px; }
@media (min-width: 900px) {
  .auth { padding-top: 12px; }
  .auth__grid { grid-template-columns: 1.25fr 1fr; gap: 40px; align-items: start; }
  .auth__grid > aside { position: sticky; top: calc(var(--header-h) + 24px); margin-top: 54px; }
}

.plan-picker { margin-bottom: 12px; }

.card {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 14px;
  padding: 22px;
  border-radius: var(--radius-lg);
  background: var(--card);
  box-shadow: var(--shadow);
}
@media (min-width: 600px) { .card { padding: 30px 32px; } }
.card h1 { font-size: clamp(1.625rem, 3.5vw, 2rem); }
.lead { margin-top: -8px; color: var(--muted); font-size: 0.9375rem; }
.card .form { gap: 14px; }
.muted { color: var(--muted); font-size: 0.9375rem; text-align: center; }
.linklike { padding: 0; border: 0; background: none; color: var(--accent); font-weight: 500; }
</style>
