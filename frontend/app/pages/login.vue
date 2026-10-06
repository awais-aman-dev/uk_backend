<script setup lang="ts">
import { loginSchema } from '#shared/schemas/auth'

definePageMeta({ middleware: 'guest' })
useHead({ title: 'Log in — 1Theory' })

const route = useRoute()
const { login } = useAuth()
const { find } = await usePackages()
const plan = find(route.query.plan)

const { values, errors, pending, validateField, handleSubmit } = useZodForm(loginSchema, {
  email: typeof route.query.email === 'string' ? route.query.email : '',
  password: '',
  remember: true
})

const onSubmit = handleSubmit(async (data) => {
  const { user } = await login(data)
  // Came from a pricing card: straight to paying for it
  if (plan) return startCheckout(plan.slug)
  await navigateTo(safeNext(route.query.next) ?? homeFor(user!))
})
</script>

<template>
  <AuthCard title="Welcome back" back="/">
    <template #top>
      <span class="plate" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M8 5h3.2v11H17v3H8z" /></svg></span>
    </template>
    <template #lead>
      Log in to carry on where you left off.
      <template v-if="plan"><br>You'll go straight to payment for <strong>{{ plan.name }}</strong>.</template>
    </template>

    <form class="form" method="post" novalidate @submit.prevent="onSubmit">
      <UiAlert v-if="errors.form">{{ errors.form }}</UiAlert>

      <UiInput
        v-model="values.email"
        label="Email"
        type="email"
        inputmode="email"
        autocomplete="email"
        :error="errors.email"
        required
        @blur="validateField('email')"
      />
      <UiPasswordInput v-model="values.password" :error="errors.password" @blur="validateField('password')" />

      <div class="login__row">
        <UiCheckbox v-model="values.remember">Keep me signed in for 30 days</UiCheckbox>
        <NuxtLink :to="{ path: '/auth/forgot-password', query: values.email ? { email: values.email } : {} }" class="form-link">Forgot password?</NuxtLink>
      </div>

      <UiButton type="submit" variant="primary" size="lg" block :loading="pending">
        Log in
      </UiButton>
    </form>

    <p class="login__alt">
      New to 1Theory?
      <NuxtLink :to="{ path: '/register', query: plan ? { plan: plan.slug } : {} }" class="form-link">Create an account</NuxtLink>
    </p>
  </AuthCard>
</template>

<style scoped>
.plate {
  display: grid;
  place-items: center;
  width: 52px;
  height: 52px;
  border-radius: 14px;
  background: #fff;
  box-shadow: inset 0 0 0 1px rgb(0 0 0 / 0.08), 0 4px 12px rgb(0 0 0 / 0.1);
}
.plate svg { width: 36px; height: 36px; fill: var(--stop); }
.login__row { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 8px; margin-top: -6px; font-size: 0.9375rem; }
.login__alt { text-align: center; color: var(--muted); font-size: 0.9375rem; }
</style>
