<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    label: string
    type?: string
    error?: string
    hint?: string
    autocomplete?: string
    inputmode?: 'text' | 'email' | 'numeric' | 'tel' | 'search' | 'url'
    placeholder?: string
    required?: boolean
    disabled?: boolean
  }>(),
  { type: 'text' }
)
const model = defineModel<string>({ default: '' })
const emit = defineEmits<{ blur: [] }>()

const id = useId()
const describedBy = computed(() => [props.error && `${id}-error`, props.hint && `${id}-hint`].filter(Boolean).join(' ') || undefined)

const input = ref<HTMLInputElement>()
defineExpose({ focus: () => input.value?.focus() })
</script>

<template>
  <div class="field" :class="{ 'field--invalid': error }">
    <label :for="id" class="field__label">{{ label }}</label>
    <p v-if="hint" :id="`${id}-hint`" class="field__hint">{{ hint }}</p>
    <div class="field__control">
      <input
        :id="id"
        ref="input"
        v-model="model"
        class="field__input"
        :type="type"
        :autocomplete="autocomplete"
        :inputmode="inputmode"
        :placeholder="placeholder"
        :required="required"
        :disabled="disabled"
        :aria-invalid="!!error"
        :aria-describedby="describedBy"
        @blur="emit('blur')"
      >
      <slot name="suffix" />
    </div>
    <p v-if="error" :id="`${id}-error`" class="field__error"><slot name="error">{{ error }}</slot></p>
  </div>
</template>
