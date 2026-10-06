<script setup lang="ts">
import { forgotPasswordSchema } from '#shared/schemas/auth'

useHead({ title: 'Reset your password — 1Theory' })
const route = useRoute()
const sent = ref(false)
const { values, errors, pending, validateField, handleSubmit } = useZodForm(forgotPasswordSchema, {
  email: typeof route.query.email === 'string' ? route.query.email : ''
})
const onSubmit = handleSubmit(async (body) => {
  await $fetch('/api/auth/password/forgot', { method: 'POST', body })
  sent.value = true
})
</script>

<template>
  <AuthCard title="Reset your password" :lead="sent ? '' : 'Enter your email and we’ll send you a link to set a new password.'">
    <template v-if="sent">
      <UiAlert variant="info">If <b>{{ values.email }}</b> has an account, a reset link is on its way. It works once and expires soon.</UiAlert>
      <NuxtLink to="/login" class="btn btn--primary btn--lg btn--block">Back to log in</NuxtLink>
    </template>
    <form v-else class="form" novalidate @submit.prevent="onSubmit">
      <UiAlert v-if="errors.form">{{ errors.form }}</UiAlert>
      <UiInput v-model="values.email" label="Email" type="email" inputmode="email" autocomplete="email" :error="errors.email" required @blur="validateField('email')" />
      <UiButton type="submit" variant="primary" size="lg" block :loading="pending">Send reset link</UiButton>
    </form>
  </AuthCard>
</template>
