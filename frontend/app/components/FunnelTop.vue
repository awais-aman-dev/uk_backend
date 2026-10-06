<script setup lang="ts">
// Back button + "Account → Payment → Learn" progress, shared by the sign-up and payment pages.
defineProps<{ step: 1 | 2; fallback?: string }>()
const labels = ['Account', 'Payment', 'Learn']
</script>

<template>
  <div class="funnel">
    <BackButton :fallback="fallback ?? '/#pricing'" />
    <ol class="funnel__steps" aria-label="Checkout progress">
      <li
        v-for="(l, i) in labels"
        :key="l"
        :class="{ 'is-done': i + 1 < step, 'is-current': i + 1 === step }"
        :aria-current="i + 1 === step ? 'step' : undefined"
      >
        <span>
          <svg v-if="i + 1 < step" viewBox="0 0 16 16" aria-hidden="true"><path d="m3.5 8.5 3 3 6-7" /></svg>
          <template v-else>{{ i + 1 }}</template>
        </span>
        {{ l }}
      </li>
    </ol>
  </div>
</template>

<style scoped>
.funnel { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 12px; }
.funnel__steps { list-style: none; display: flex; gap: 6px; margin: 0; padding: 0; font-size: 0.8125rem; color: var(--muted); }
.funnel__steps li { display: flex; align-items: center; gap: 6px; }
.funnel__steps li + li::before { content: ''; width: 14px; height: 1px; background: var(--line); }
.funnel__steps span {
  display: grid;
  place-items: center;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  box-shadow: inset 0 0 0 1px var(--line);
  font-size: 0.6875rem;
  font-weight: 600;
}
.funnel__steps svg { width: 12px; height: 12px; fill: none; stroke: #fff; stroke-width: 2.2; stroke-linecap: round; stroke-linejoin: round; }
.funnel__steps .is-done span { background: var(--go); box-shadow: none; }
.funnel__steps .is-current { color: var(--ink); font-weight: 500; }
.funnel__steps .is-current span { background: var(--ink); color: #fff; box-shadow: none; }
</style>
