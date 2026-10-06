<script setup lang="ts">
withDefaults(defineProps<{ variant?: 'error' | 'success' | 'info' }>(), { variant: 'error' })
</script>

<template>
  <div class="alert" :class="`alert--${variant}`" :role="variant === 'error' ? 'alert' : 'status'">
    <span class="alert__icon" aria-hidden="true">{{ variant === 'error' ? '!' : variant === 'success' ? '✓' : 'i' }}</span>
    <div><slot /></div>
  </div>
</template>

<style scoped>
.alert {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  padding: 14px 16px;
  border-radius: 14px;
  font-size: 0.9375rem;
}
.alert__icon {
  flex: none;
  display: grid;
  place-items: center;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  color: #fff;
  font-size: 0.75rem;
  font-weight: 800;
}
.alert--error { background: var(--stop-soft); color: #a10f0a; }
.alert--error .alert__icon { background: var(--stop); }
.alert--success { background: var(--go-soft); color: #145c27; }
.alert--success .alert__icon { background: var(--go); }
.alert--info { background: var(--accent-soft); color: #00418a; }
.alert--info .alert__icon { background: var(--accent); }
.alert :deep(a) { color: inherit; font-weight: 700; }
</style>
