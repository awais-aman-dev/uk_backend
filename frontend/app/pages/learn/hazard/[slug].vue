<script setup lang="ts">
definePageMeta({ layout: 'learn', middleware: 'auth', focus: true })

const route = useRoute()
const { data, error } = await useFetch(() => `/api/learn/hazard/${route.params.slug}`)
useHead({ title: () => `${data.value?.clip.title ?? 'Hazard clip'} — 1Theory` })
</script>

<template>
  <div class="page">
    <header class="bar">
      <BackButton fallback="/learn/hazard" dark label="Clips" />
      <span v-if="data" class="bar__title">{{ data.clip.title }}</span>
    </header>
    <LearnLocked v-if="error?.statusCode === 402" />
    <UiAlert v-else-if="error">This clip couldn’t be loaded.</UiAlert>
    <LearnHazardPlayer
      v-else-if="data"
      :key="data.clip.slug"
      :clip="data.clip"
      :signs="data.signs"
      :next="data.next"
      :index="data.index"
      :total="data.total"
      class="page__player"
    />
  </div>
</template>

<style scoped>
.page { display: grid; grid-template-rows: auto 1fr; height: 100dvh; background: #000; }
.bar { display: flex; align-items: center; gap: 14px; padding: 10px 14px; color: #fff; }
.bar__title { font-weight: 600; }
.page__player { min-height: 0; }
</style>
