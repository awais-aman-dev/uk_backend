<script setup lang="ts">
// Stripe's "back" link: the learner left the payment page. Nothing was charged; they can pick again.
useHead({ title: 'Payment cancelled — 1Theory' })
const route = useRoute()
const cancelled = route.query.cancelled === '1'
</script>

<template>
  <section class="pay">
    <div class="container">
      <div class="card">
        <BackButton fallback="/#pricing" />
        <h1>{{ cancelled ? 'Payment cancelled' : 'Checkout' }}</h1>
        <p class="lead">{{ cancelled ? 'No money was taken. You can choose a plan and try again whenever you’re ready.' : 'Choose a plan to continue.' }}</p>
        <div class="actions">
          <NuxtLink to="/#pricing" class="btn btn--primary">Choose a plan</NuxtLink>
          <NuxtLink to="/account" class="btn btn--ghost">My account</NuxtLink>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.pay { padding: 24px 0 96px; }
.card { display: grid; gap: 14px; max-width: 520px; margin: 0 auto; padding: 32px 28px; border-radius: var(--radius-lg); background: var(--card); box-shadow: var(--shadow); }
.card h1 { font-size: clamp(1.5rem, 3.5vw, 1.875rem); }
.lead { color: var(--muted); }
.actions { display: flex; flex-wrap: wrap; gap: 10px; }
</style>
