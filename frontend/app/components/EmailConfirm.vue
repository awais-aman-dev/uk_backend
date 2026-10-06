<script setup lang="ts">
// Confirms an emailed link on open: a new account's email ("signup") or a changed address ("change").
const props = defineProps<{ kind: 'signup' | 'change' }>()
const route = useRoute()
const token = typeof route.query.token === 'string' ? route.query.token : ''
const state = ref<'working' | 'ok' | 'failed'>(token ? 'working' : 'failed')
const message = ref(token ? '' : 'This link is incomplete. Open it again from the email.')
onMounted(async () => {
  if (!token) return
  try {
    const res = await $fetch('/api/auth/verify-email', { method: 'POST', body: { token, kind: props.kind } })
    message.value = res.message
    state.value = 'ok'
  } catch (e) {
    message.value = apiErrorsOf(e).form ?? 'This link is invalid or has expired.'
    state.value = 'failed'
  }
})
</script>

<template>
  <AuthCard :title="state === 'working' ? 'Confirming…' : state === 'ok' ? 'Email confirmed' : 'Link not valid'" :lead="message">
    <NuxtLink v-if="state !== 'working'" :to="useAuthUser().value ? '/account' : '/login'" class="btn btn--primary btn--lg btn--block">
      {{ useAuthUser().value ? 'Go to my account' : 'Log in' }}
    </NuxtLink>
  </AuthCard>
</template>
