<script setup lang="ts">
defineProps<{ title?: string }>()
</script>

<template>
  <div class="locked">
    <div class="locked__icon"><AppIcon name="lock" :size="30" /></div>
    <h2>{{ title ?? 'Unlock everything' }}</h2>
    <p>Lessons, practice, mock tests, hazard perception and the Highway Code e-book come with every plan.</p>
    <NuxtLink to="/account" class="btn btn--primary btn--lg">Choose a plan — from £5</NuxtLink>
  </div>
</template>

<style scoped>
.locked { display: grid; justify-items: center; gap: 14px; max-width: 460px; margin: 48px auto; padding: 40px 28px; border-radius: var(--radius-xl); background: var(--card); box-shadow: var(--shadow); text-align: center; }
.locked__icon { display: grid; place-items: center; width: 64px; height: 64px; border-radius: 20px; background: var(--gradient); color: #fff; }
.locked h2 { font-size: 1.75rem; }
.locked p { color: var(--muted); }
</style>
