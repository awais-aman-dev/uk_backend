<script setup lang="ts">
// Centred glass dialog (not teleported, so it keeps the learning app’s theme variables) with backdrop, Esc / backdrop click to close and a spring entrance.
const open = defineModel<boolean>('open', { default: false })
defineProps<{ title?: string; width?: string }>()

onMounted(() => {
  const onKey = (e: KeyboardEvent) => e.key === 'Escape' && (open.value = false)
  window.addEventListener('keydown', onKey)
  onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
})
</script>

<template>
  <Transition name="modal">
    <div v-if="open" class="modal" @click.self="open = false">
      <div class="modal__box glass" role="dialog" :aria-label="title" :style="{ width: width ?? 'min(520px, 100%)' }">
        <header v-if="title" class="modal__head">
          <b>{{ title }}</b>
          <button type="button" class="modal__x" aria-label="Close" @click="open = false"><AppIcon name="close" :size="18" /></button>
        </header>
        <slot />
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.modal { position: fixed; inset: 0; z-index: 90; display: grid; place-items: center; padding: 16px; background: rgb(0 0 0 / 0.38); }
.modal__box { max-height: 90dvh; overflow-y: auto; padding: 22px; border-radius: 28px; color: var(--ink); }
.modal__head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; }
.modal__x { display: grid; place-items: center; width: 32px; height: 32px; border: 0; border-radius: 50%; background: rgb(127 127 127 / 0.14); color: var(--ink); }
.modal-enter-active, .modal-leave-active { transition: opacity 0.25s; }
.modal-enter-active .modal__box { transition: transform 0.45s var(--spring); }
.modal-enter-from, .modal-leave-to { opacity: 0; }
.modal-enter-from .modal__box { transform: scale(0.95) translateY(10px); }
</style>
