<script setup lang="ts">
definePageMeta({ layout: 'learn', middleware: 'auth' })

const route = useRoute()
const toast = useToast()
const { data, error, refresh } = await useFetch(() => `/api/learn/lessons/${route.params.slug}`, { lazy: true })
useSignedUrlRefresh(refresh) // signed video/document URLs from Django expire after ~1 h
useHead({ title: () => `${data.value?.lesson.title ?? 'Lesson'} — 1Theory` })

// Reading progress bar
const progress = ref(0)
onMounted(() => {
  const onScroll = () => {
    const h = document.documentElement.scrollHeight - window.innerHeight
    progress.value = h > 0 ? Math.min(1, window.scrollY / h) : 1
  }
  window.addEventListener('scroll', onScroll, { passive: true })
  onScroll()
  onBeforeUnmount(() => window.removeEventListener('scroll', onScroll))
})

const completing = ref(false)
async function complete() {
  completing.value = true
  try {
    await $fetch(`/api/learn/lessons/${route.params.slug}/complete`, { method: 'POST' })
    toast.show('Lesson complete. Nice one!')
    await refresh()
    if (data.value?.next) await navigateTo(`/learn/lessons/${data.value.next.slug}`)
  } finally {
    completing.value = false
  }
}
</script>

<template>
  <div>
    <div class="readbar" :style="{ transform: `scaleX(${progress})` }" aria-hidden="true" />
    <LearnLocked v-if="error?.statusCode === 402" />
    <UiAlert v-else-if="error">Lesson not found. <NuxtLink to="/learn/lessons">All lessons</NuxtLink></UiAlert>
    <LearnSkeleton v-else-if="!data" variant="article" class="lesson" />
    <article v-else class="lesson">
      <BackButton fallback="/learn/lessons" label="Lessons" />
      <header class="lesson__head">
        <p class="lesson__topic"><AppIcon :name="data.topic.icon" :size="16" /> {{ data.topic.title }} · {{ data.lesson.minutes }} min</p>
        <h1>{{ data.lesson.title }}</h1>
        <p class="lesson__summary">{{ data.lesson.summary }}</p>
      </header>

      <LearnBlockRenderer :blocks="data.lesson.blocks" :signs="data.signs" :questions="data.questions" :clips="data.clips" />

      <footer class="lesson__foot">
        <UiButton v-if="!data.done" variant="primary" size="lg" :loading="completing" @click="complete">
          Mark as complete{{ data.next ? ' & continue' : '' }}
        </UiButton>
        <p v-else class="lesson__done"><AppIcon name="check" :size="18" /> Completed</p>
        <nav class="lesson__nav">
          <NuxtLink v-if="data.prev" :to="`/learn/lessons/${data.prev.slug}`" class="lesson__navitem">
            <small>Previous</small><b>{{ data.prev.title }}</b>
          </NuxtLink>
          <NuxtLink v-if="data.next" :to="`/learn/lessons/${data.next.slug}`" class="lesson__navitem lesson__navitem--next">
            <small>Next</small><b>{{ data.next.title }}</b>
          </NuxtLink>
        </nav>
      </footer>
    </article>
  </div>
</template>

<style scoped>
.readbar { position: fixed; z-index: 45; left: 0; right: 0; top: 0; height: 3px; background: var(--gradient); transform-origin: left; }
.lesson { display: grid; gap: 26px; max-width: 760px; margin-inline: auto; }
.lesson > .back { justify-self: start; }
.lesson__head { display: grid; gap: 10px; }
.lesson__topic { display: flex; gap: 6px; align-items: center; color: var(--accent); font-size: 0.875rem; font-weight: 600; }
.lesson__head h1 { font-size: clamp(2.25rem, 6vw, 3.5rem); color: var(--ink); }
.lesson__summary { font-size: 1.25rem; color: var(--muted); }
.lesson__foot { display: grid; gap: 20px; margin-top: 12px; padding-top: 24px; border-top: 1px solid var(--line-soft); }
.lesson__foot > .ui-btn { justify-self: start; }
.lesson__done { display: flex; gap: 8px; align-items: center; color: var(--go-text); font-weight: 600; }
.lesson__nav { display: grid; gap: 10px; }
@media (min-width: 640px) { .lesson__nav { grid-template-columns: 1fr 1fr; } }
.lesson__navitem { display: grid; padding: 16px 18px; border-radius: 18px; background: var(--card); box-shadow: var(--shadow); color: var(--ink); text-decoration: none; }
.lesson__navitem:hover { text-decoration: none; box-shadow: var(--shadow-lg); }
.lesson__navitem small { color: var(--muted); }
.lesson__navitem--next { text-align: right; grid-column: -2; }
</style>
