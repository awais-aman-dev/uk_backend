<script setup lang="ts">
import { emailChangeSchema, passwordChangeSchema, profileSchema } from '#shared/schemas/auth'

// Account settings: name and phone, email (confirmed through a link to the new address), password.
definePageMeta({ middleware: 'auth' })
useHead({ title: 'Settings — 1Theory' })

const toast = useToast()
const user = useAuthUser()
const { data, refresh } = await useFetch('/api/account')

const profile = useZodForm(profileSchema, {
  firstName: data.value?.profile.firstName ?? '',
  lastName: data.value?.profile.lastName ?? '',
  phone: data.value?.profile.phone ?? ''
})
const saveProfile = profile.handleSubmit(async (body) => {
  await $fetch('/api/account/profile', { method: 'PATCH', body })
  const me = await $fetch('/api/auth/me')
  user.value = me.user
  await refresh()
  toast.show('Profile saved')
})

const email = useZodForm(emailChangeSchema, { email: '' })
const emailSent = ref<string>()
const changeEmail = email.handleSubmit(async (body) => {
  const { message } = await $fetch('/api/account/email', { method: 'POST', body })
  emailSent.value = message
  email.reset()
})

const password = useZodForm(passwordChangeSchema, { currentPassword: '', password: '', confirmPassword: '' })
const changePassword = password.handleSubmit(async (body) => {
  await $fetch('/api/account/password', { method: 'POST', body })
  password.reset()
  toast.show('Password changed. Other devices have been signed out.')
})
</script>

<template>
  <section class="settings">
    <div class="container settings__inner">
      <BackButton fallback="/account" label="My account" />
      <h1>Settings</h1>

      <form class="panel" novalidate @submit.prevent="saveProfile">
        <h2>Your details</h2>
        <UiAlert v-if="profile.errors.value.form">{{ profile.errors.value.form }}</UiAlert>
        <div class="row">
          <UiInput v-model="profile.values.firstName" label="First name" autocomplete="given-name" :error="profile.errors.value.firstName" @blur="profile.validateField('firstName')" />
          <UiInput v-model="profile.values.lastName" label="Last name" autocomplete="family-name" :error="profile.errors.value.lastName" @blur="profile.validateField('lastName')" />
        </div>
        <UiInput v-model="profile.values.phone" label="Phone (optional)" type="tel" inputmode="tel" autocomplete="tel" :error="profile.errors.value.phone" @blur="profile.validateField('phone')" />
        <UiButton type="submit" variant="primary" :loading="profile.pending.value">Save</UiButton>
      </form>

      <form class="panel" novalidate @submit.prevent="changeEmail">
        <h2>Email</h2>
        <p class="muted">Currently <b>{{ data?.profile.email }}</b>. We’ll send a confirmation link to the new address; it changes once you open it.</p>
        <UiAlert v-if="emailSent" variant="info">{{ emailSent }}</UiAlert>
        <UiAlert v-if="email.errors.value.form">{{ email.errors.value.form }}</UiAlert>
        <UiInput v-model="email.values.email" label="New email" type="email" inputmode="email" autocomplete="email" :error="email.errors.value.email" @blur="email.validateField('email')" />
        <UiButton type="submit" variant="primary" :loading="email.pending.value">Send confirmation link</UiButton>
      </form>

      <form v-if="!data?.profile.googleOnly" class="panel" novalidate @submit.prevent="changePassword">
        <h2>Password</h2>
        <UiAlert v-if="password.errors.value.form">{{ password.errors.value.form }}</UiAlert>
        <UiPasswordInput v-model="password.values.currentPassword" label="Current password" autocomplete="current-password" :error="password.errors.value.currentPassword" @blur="password.validateField('currentPassword')" />
        <UiPasswordInput v-model="password.values.password" label="New password" autocomplete="new-password" show-rules :error="password.errors.value.password" @blur="password.validateField('password')" />
        <UiPasswordInput v-model="password.values.confirmPassword" label="Repeat new password" autocomplete="new-password" :error="password.errors.value.confirmPassword" @blur="password.validateField('confirmPassword')" />
        <UiButton type="submit" variant="primary" :loading="password.pending.value">Change password</UiButton>
      </form>
    </div>
  </section>
</template>

<style scoped>
.settings { padding: 24px 0 88px; }
.settings__inner { display: grid; gap: 18px; max-width: 640px; }
h1 { font-size: clamp(2rem, 5vw, 2.5rem); }
.panel { display: grid; gap: 14px; padding: 24px; border-radius: var(--radius-lg); background: var(--card); box-shadow: var(--shadow); }
.panel h2 { font-size: 1.25rem; }
.row { display: grid; gap: 14px; }
@media (min-width: 600px) { .row { grid-template-columns: 1fr 1fr; } }
.muted { color: var(--muted); font-size: 0.9375rem; }
.panel :deep(.btn) { justify-self: start; }
</style>
