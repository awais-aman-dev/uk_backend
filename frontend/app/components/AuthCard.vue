<script setup lang="ts">
// The small centred glass card of the login, password and email-link pages.
withDefaults(defineProps<{ title: string; lead?: string; back?: string }>(), { lead: '', back: '/login' })
</script>

<template>
  <section class="auth-card">
    <div class="auth-card__glow" aria-hidden="true" />
    <div class="container auth-card__grid">
      <div class="auth-card__back"><BackButton :fallback="back" /></div>
      <div class="card glass">
        <slot name="top" />
        <h1>{{ title }}</h1>
        <p v-if="lead || $slots.lead" class="lead"><slot name="lead">{{ lead }}</slot></p>
        <slot />
      </div>
    </div>
  </section>
</template>

<style scoped>
.auth-card { position: relative; overflow: hidden; padding: 12px 0 96px; }
.auth-card__glow {
  position: absolute;
  left: 50%;
  top: -10%;
  width: 900px;
  height: 600px;
  margin-left: -450px;
  background:
    radial-gradient(closest-side at 35% 50%, rgb(41 151 255 / 0.22), transparent),
    radial-gradient(closest-side at 65% 50%, rgb(162 89 255 / 0.18), transparent);
  pointer-events: none;
}
.auth-card__grid { position: relative; display: grid; grid-template-columns: minmax(0, 1fr); justify-items: center; gap: 16px; }
.auth-card__back { width: 100%; max-width: 440px; }
.card { width: 100%; max-width: 440px; display: grid; grid-template-columns: minmax(0, 1fr); gap: 18px; padding: 32px 24px; border-radius: var(--radius-xl); }
@media (min-width: 600px) { .card { padding: 40px; } }
h1 { font-size: 2rem; }
.lead { margin-top: -10px; color: var(--muted); }
.card :deep(.form) { display: grid; gap: 14px; }
</style>
