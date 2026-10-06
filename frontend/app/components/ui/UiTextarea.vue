<script setup lang="ts">
const props = defineProps<{ label: string; error?: string; hint?: string; maxlength?: number; placeholder?: string }>()
const model = defineModel<string>({ default: '' })
const emit = defineEmits<{ blur: [] }>()
const id = useId()
const describedBy = computed(() => [props.error && `${id}-error`, props.hint && `${id}-hint`].filter(Boolean).join(' ') || undefined)
</script>

<template>
  <div class="field" :class="{ 'field--invalid': error }">
    <label :for="id" class="field__label">{{ label }}</label>
    <p v-if="hint" :id="`${id}-hint`" class="field__hint">{{ hint }}</p>
    <div class="field__control">
      <textarea
        :id="id"
        v-model="model"
        class="field__input"
        :maxlength="maxlength"
        :placeholder="placeholder"
        :aria-invalid="!!error"
        :aria-describedby="describedBy"
        @blur="emit('blur')"
      />
    </div>
    <div class="textarea__meta">
      <p v-if="error" :id="`${id}-error`" class="field__error">{{ error }}</p>
      <span v-if="maxlength" class="field__hint textarea__count">{{ model.length }} / {{ maxlength }}</span>
    </div>
  </div>
</template>

<style scoped>
.textarea__meta { display: flex; gap: 12px; justify-content: space-between; }
.textarea__count { margin-left: auto; font-variant-numeric: tabular-nums; }
</style>
