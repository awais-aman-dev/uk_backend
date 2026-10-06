<script setup lang="ts">
withDefaults(
  defineProps<{
    type?: 'button' | 'submit'
    variant?: 'dark' | 'primary' | 'ghost'
    size?: 'sm' | 'md' | 'lg'
    block?: boolean
    loading?: boolean
    disabled?: boolean
  }>(),
  { type: 'button', variant: 'dark', size: 'md' }
)
</script>

<template>
  <button
    :type="type"
    class="btn ui-btn"
    :class="[
      variant !== 'dark' && `btn--${variant}`,
      size !== 'md' && `btn--${size}`,
      { 'btn--block': block, 'is-loading': loading }
    ]"
    :disabled="disabled || loading"
    :aria-busy="loading"
  >
    <span v-if="loading" class="ui-btn__spinner" aria-hidden="true" />
    <slot />
  </button>
</template>

<style scoped>
.ui-btn:disabled { cursor: not-allowed; opacity: 0.65; transform: none; }
.ui-btn.is-loading { opacity: 0.85; cursor: progress; }
.ui-btn__spinner {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 2.5px solid currentColor;
  border-right-color: transparent;
  animation: spin 0.7s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
</style>
