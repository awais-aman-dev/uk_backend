<script setup lang="ts">
// Apple-bag-style order summary: light card, hairline dividers, big total.
defineProps<{ label: string; title: string; subtitle: string; price: string; features?: readonly string[]; note?: string }>()
</script>

<template>
  <aside class="summary" aria-label="Order summary">
    <p class="summary__label">{{ label }}</p>
    <div class="summary__row">
      <div>
        <h2>{{ title }}</h2>
        <p>{{ subtitle }}</p>
      </div>
      <strong>{{ price }}</strong>
    </div>
    <ul v-if="features?.length" class="summary__features">
      <li v-for="f in features" :key="f"><AppIcon name="check" :size="16" />{{ f }}</li>
    </ul>
    <dl v-if="$slots.default" class="summary__list"><slot /></dl>
    <div class="summary__total">
      <span>Total</span>
      <strong>{{ price }}</strong>
    </div>
    <p v-if="note" class="summary__note">{{ note }}</p>
  </aside>
</template>

<style scoped>
.summary { padding: 28px; border-radius: var(--radius-lg); background: var(--card); box-shadow: var(--shadow); }
.summary__label { font-size: 0.8125rem; font-weight: 600; color: var(--muted); }
.summary__row { display: flex; justify-content: space-between; gap: 16px; margin-top: 10px; }
.summary__row h2 { font-size: 1.5rem; }
.summary__row p { color: var(--muted); margin-top: 2px; font-size: 0.9375rem; }
.summary__row strong { font-size: 1.25rem; font-weight: 600; }
.summary__features { list-style: none; margin: 20px 0 0; padding: 18px 0 0; border-top: 1px solid var(--line-soft); display: grid; gap: 9px; font-size: 0.9375rem; }
.summary__features li { display: flex; gap: 10px; align-items: center; }
.summary__features :deep(.icon) { color: var(--accent); flex: none; }
.summary__list { margin: 20px 0 0; padding: 16px 0 0; border-top: 1px solid var(--line-soft); display: grid; gap: 10px; font-size: 0.9375rem; }
.summary__list :deep(div) { display: flex; justify-content: space-between; gap: 12px; align-items: center; }
.summary__list :deep(dt) { color: var(--muted); }
.summary__list :deep(dd) { margin: 0; font-weight: 500; text-align: right; }
.summary__total { display: flex; justify-content: space-between; align-items: baseline; margin-top: 20px; padding-top: 18px; border-top: 1px solid var(--line-soft); font-weight: 600; font-size: 1.1875rem; }
.summary__total strong { font-family: var(--font-display); font-size: 2rem; letter-spacing: -0.03em; }
.summary__note { margin-top: 10px; font-size: 0.8125rem; color: var(--muted); }
@media (max-width: 899px) { .summary__features { display: none; } }
</style>
