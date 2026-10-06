<script setup lang="ts">
import type { Toast } from '~/composables/useToast'

// Toasts as drops of the island's liquid glass (see ToastDrop). A dismissed toast stays mounted while its drop is
// absorbed back into the island, then it's removed.
const { toasts, dismiss } = useToast()
const items = ref<(Toast & { leaving: boolean; slot: number })[]>([])

// Stack position counts only the toasts that are staying; a leaving one keeps the slot it had
const slotOf = (it: { id: number; leaving: boolean; slot: number }) =>
  it.leaving ? it.slot : items.value.filter((x) => !x.leaving).findIndex((x) => x.id === it.id)

watch(
  toasts,
  (list) => {
    const ids = new Set(list.map((t) => t.id))
    for (const it of items.value) {
      if (!it.leaving && !ids.has(it.id)) {
        it.slot = slotOf(it)
        it.leaving = true
      }
    }
    for (const t of list) if (!items.value.some((it) => it.id === t.id)) items.value.push({ ...t, leaving: false, slot: 0 })
  },
  { immediate: true, deep: true }
)
const gone = (id: number) => (items.value = items.value.filter((it) => it.id !== id))
</script>

<template>
  <div class="drops" aria-live="polite">
    <ClientOnly>
      <ToastDrop
        v-for="it in items"
        :key="it.id"
        :toast="it"
        :index="slotOf(it)"
        :leaving="it.leaving"
        @dismiss="dismiss(it.id)"
        @gone="gone(it.id)"
      />
    </ClientOnly>
  </div>
</template>

<style scoped>
.drops { position: fixed; z-index: 60; inset: 0 0 auto; height: 0; pointer-events: none; }
</style>
