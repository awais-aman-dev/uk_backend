<script setup lang="ts">
import type { SignSpec } from '#shared/types/learn'

// Spotlight-style palette (⌘K). Arrow keys + Enter, Esc to close.
const open = defineModel<boolean>('open', { default: false })
const query = ref('')
const active = ref(0)
const input = ref<HTMLInputElement>()
type Result = { kind: string; icon: string; title: string; sub: string; to: string; sign?: SignSpec }
const results = ref<Result[]>([])
const loading = ref(false)

let timer: ReturnType<typeof setTimeout> | undefined
let seq = 0
watch(query, (q) => {
  clearTimeout(timer)
  active.value = 0
  if (q.trim().length < 2) return (results.value = [])
  loading.value = true
  const mine = ++seq
  timer = setTimeout(async () => {
    try {
      const res = await $fetch<{ results: Result[] }>('/api/learn/search', { query: { q } })
      if (mine === seq) results.value = res.results // a newer query wins
    } finally {
      if (mine === seq) loading.value = false
    }
  }, 160)
})
watch(open, (o) => {
  if (o) nextTick(() => input.value?.focus())
  else query.value = ''
})

const suggestions: Result[] = [
  { kind: 'Jump to', icon: 'timer', title: 'Start a mock test', sub: '10 questions · 12 minutes', to: '/learn/mock' },
  { kind: 'Jump to', icon: 'hazard', title: 'Hazard perception clips', sub: 'Six clips, scored like the real test', to: '/learn/hazard' },
  { kind: 'Jump to', icon: 'target', title: 'Practise my mistakes', sub: 'Questions you got wrong last time', to: '/learn/practice?mode=mistakes' },
  { kind: 'Jump to', icon: 'book', title: 'Highway Code e-book', sub: 'Read or download the PDF', to: '/learn/ebook' }
]
const list = computed(() => (query.value.trim().length >= 2 ? results.value : suggestions))

function go(r: Result | undefined) {
  if (!r) return
  open.value = false
  navigateTo(r.to)
}
function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') open.value = false
  else if (e.key === 'ArrowDown') {
    e.preventDefault()
    active.value = Math.min(list.value.length - 1, active.value + 1)
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    active.value = Math.max(0, active.value - 1)
  } else if (e.key === 'Enter') go(list.value[active.value])
}
</script>

<template>
  <Transition name="spot">
    <div v-if="open" class="spot-wrap" @click.self="open = false" @keydown="onKey">
      <div class="spot glass" role="dialog" aria-label="Search">
        <label class="spot__field">
          <AppIcon name="search" :size="22" />
          <input ref="input" v-model="query" type="search" placeholder="Search lessons, signs, rules…" aria-label="Search" autocomplete="off">
          <kbd>esc</kbd>
        </label>
        <ul class="spot__list" role="listbox">
          <li v-for="(r, i) in list" :key="r.kind + r.title" role="option" :aria-selected="i === active">
            <button type="button" :class="{ 'is-active': i === active }" @mouseenter="active = i" @click="go(r)">
              <span class="spot__icon">
                <LearnSignGraphic v-if="r.sign" :spec="r.sign" :size="28" />
                <AppIcon v-else :name="r.icon" :size="20" />
              </span>
              <span class="spot__text">
                <b>{{ r.title }}</b>
                <small>{{ r.sub }}</small>
              </span>
              <span class="spot__kind">{{ r.kind }}</span>
            </button>
          </li>
          <li v-if="query.trim().length >= 2 && !loading && !results.length" class="spot__empty">No results for “{{ query }}”</li>
        </ul>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.spot-wrap { position: fixed; inset: 0; z-index: 80; display: grid; justify-items: center; align-items: start; padding: 12vh 12px 12px; background: rgb(0 0 0 / 0.3); }
.spot { width: min(640px, 100%); border-radius: 22px; overflow: hidden; color: var(--ink); }
.spot__field { display: flex; align-items: center; gap: 12px; padding: 16px 18px; border-bottom: 1px solid var(--line-soft); color: var(--muted); }
.spot__field input { flex: 1; border: 0; outline: none; background: none; color: var(--ink); font: inherit; font-size: 1.25rem; }
.spot__field kbd { font: inherit; font-size: 0.75rem; padding: 2px 6px; border-radius: 6px; background: rgb(127 127 127 / 0.15); }
.spot__list { list-style: none; margin: 0; padding: 8px; max-height: 56vh; overflow-y: auto; }
.spot__list button {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 10px;
  border: 0;
  border-radius: 12px;
  background: none;
  color: inherit;
  text-align: left;
}
.spot__list button.is-active { background: var(--accent); color: #fff; }
.spot__list button.is-active small, .spot__list button.is-active .spot__kind { color: rgb(255 255 255 / 0.8); }
.spot__icon { display: grid; place-items: center; flex: none; width: 36px; height: 36px; border-radius: 10px; background: rgb(127 127 127 / 0.12); color: var(--accent); }
.is-active .spot__icon { background: rgb(255 255 255 / 0.2); color: #fff; }
.spot__text { display: grid; min-width: 0; line-height: 1.3; }
.spot__text b { font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.spot__text small { color: var(--muted); font-size: 0.8125rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.spot__kind { margin-left: auto; flex: none; font-size: 0.75rem; color: var(--muted); }
.spot__empty { padding: 20px; text-align: center; color: var(--muted); }
.spot-enter-active, .spot-leave-active { transition: background-color 0.25s; }
.spot-enter-active .spot, .spot-leave-active .spot { transition: transform 0.4s var(--spring), opacity 0.25s; }
.spot-enter-from, .spot-leave-to { background-color: transparent; }
.spot-enter-from .spot, .spot-leave-to .spot { transform: scale(0.96) translateY(-10px); opacity: 0; }
</style>
