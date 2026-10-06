<script setup lang="ts">
const props = defineProps<{
  label: string
  options: readonly { value: string; label: string }[]
  placeholder?: string
  error?: string
}>()
const model = defineModel<string>({ default: '' })
const emit = defineEmits<{ blur: [] }>()
const id = useId()
</script>

<template>
  <div class="field" :class="{ 'field--invalid': error }">
    <label :for="id" class="field__label">{{ label }}</label>
    <div class="field__control select">
      <select
        :id="id"
        v-model="model"
        class="field__input"
        :aria-invalid="!!error"
        :aria-describedby="error ? `${id}-error` : undefined"
        @blur="emit('blur')"
        @change="emit('blur')"
      >
        <option v-if="props.placeholder" value="" disabled>{{ props.placeholder }}</option>
        <option v-for="o in options" :key="o.value" :value="o.value">{{ o.label }}</option>
      </select>
    </div>
    <p v-if="error" :id="`${id}-error`" class="field__error">{{ error }}</p>
  </div>
</template>

<style scoped>
.select::after {
  content: '';
  position: absolute;
  right: 18px;
  width: 8px;
  height: 8px;
  border-right: 2px solid var(--ink);
  border-bottom: 2px solid var(--ink);
  transform: translateY(-2px) rotate(45deg);
  pointer-events: none;
}
</style>
