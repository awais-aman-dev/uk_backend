<script setup lang="ts">
import { resetPasswordSchema } from '#shared/schemas/auth'

// From the emailed link (password reset, or "set your password" after buying as a guest).
useHead({ title: 'Set a new password — 1Theory' })
const route = useRoute()
const token = typeof route.query.token === 'string' ? route.query.token : ''
const done = ref(false)
const { values, errors, pending, validateField, handleSubmit } = useZodForm(resetPasswordSchema, { token, password: '', confirmPassword: '' })
const onSubmit = handleSubmit(async (body) => {
  await $fetch('/api/auth/password/reset', { method: 'POST', body })
  done.value = true
})
</script>

<template>
  <AuthCard :title="done ? 'Password set' : 'Set a new password'" :lead="done ? 'You can log in with your new password now.' : ''">
    <UiAlert v-if="!token">This link is incomplete. Open it again from the email, or ask for a new one.</UiAlert>
    <NuxtLink v-if="done" to="/login" class="btn btn--primary btn--lg btn--block">Log in</NuxtLink>
    <form v-else-if="token" class="form" novalidate @submit.prevent="onSubmit">
      <UiAlert v-if="errors.form">
        {{ errors.form }} <NuxtLink to="/auth/forgot-password">Get a new link</NuxtLink>
      </UiAlert>
      <UiPasswordInput v-model="values.password" label="New password" autocomplete="new-password" show-rules :error="errors.password" @blur="validateField('password')" />
      <UiPasswordInput v-model="values.confirmPassword" label="Repeat new password" autocomplete="new-password" :error="errors.confirmPassword" @blur="validateField('confirmPassword')" />
      <UiButton type="submit" variant="primary" size="lg" block :loading="pending">Set password</UiButton>
    </form>
  </AuthCard>
</template>
