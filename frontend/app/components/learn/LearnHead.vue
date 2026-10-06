<script setup lang="ts">
defineProps<{ eyebrow?: string; title: string; sub?: string }>()
</script>

<template>
  <header class="head">
    <div>
      <p v-if="eyebrow" class="eyebrow">{{ eyebrow }}</p>
      <h1>{{ title }}</h1>
      <p v-if="sub" class="head__sub">{{ sub }}</p>
    </div>
    <div v-if="$slots.default" class="head__actions"><slot /></div>
  </header>
</template>

<style scoped>
.head { display: flex; flex-wrap: wrap; align-items: flex-end; justify-content: space-between; gap: 16px; margin: 8px 0 24px; }
.head .eyebrow { margin-bottom: 4px; }
h1 { font-size: clamp(2rem, 5vw, 2.75rem); color: var(--ink); }
.head__sub { margin-top: 8px; max-width: 620px; color: var(--muted); font-size: 1.0625rem; }
.head__actions { display: flex; flex-wrap: wrap; gap: 8px; }
</style>
