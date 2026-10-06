import type { z } from 'zod'
import type { ApiErrorData } from '#shared/types/auth'

type Errors = Record<string, string | undefined>
/** Form state is looser than the parsed output: `terms: true` in the schema is a plain checkbox boolean here. */
type FormValues<T> = { [K in keyof T]: T[K] extends boolean ? boolean : T[K] }

/** Turns any $fetch failure into field errors (or a form-level `form` error). */
export function apiErrorsOf(e: unknown): Errors {
  const err = e as { data?: { statusMessage?: string; data?: ApiErrorData }; statusCode?: number } | null
  const fieldErrors = err?.data?.data?.fieldErrors
  if (fieldErrors && Object.keys(fieldErrors).length) return fieldErrors
  if (!err?.statusCode) return { form: "We can't reach the server. Check your connection and try again." }
  if (err.statusCode >= 500) return { form: 'Something went wrong on our side. Please try again in a moment.' }
  return { form: err.data?.statusMessage ?? 'Something went wrong. Please try again.' }
}

/**
 * Form state validated by the same zod schema the API uses.
 * Errors show after a field is left (blur) or on submit, then update live while the user fixes them.
 */
export function useZodForm<S extends z.ZodType<Record<string, unknown>>>(schema: S, initial: FormValues<z.input<S>>) {
  const values = reactive({ ...initial }) as FormValues<z.input<S>>
  const errors = ref<Errors>({})
  const pending = ref(false)
  const touched = reactive(new Set<string>())

  const issuesByField = (): Errors => {
    const result = schema.safeParse(values)
    if (result.success) return {}
    const out: Errors = {}
    for (const issue of result.error.issues) out[String(issue.path[0])] ??= issue.message
    return out
  }

  const validateField = (key: string) => {
    touched.add(key)
    errors.value = { ...errors.value, [key]: issuesByField()[key] }
  }

  // Live updates while typing: touched fields re-validate; a server error (e.g. "email already exists")
  // clears as soon as that field changes, so the layout settles before the user clicks submit again.
  watch(
    () => ({ ...(values as object) }) as Record<string, unknown>,
    (now, before) => {
      const changed = Object.keys(now).filter((k) => now[k] !== before[k])
      if (!changed.length) return
      const all = touched.size ? issuesByField() : {}
      const next: Errors = { ...errors.value, form: undefined }
      for (const key of changed) next[key] = touched.has(key) ? all[key] : undefined
      errors.value = next
    }
  )

  const focusFirstError = () =>
    nextTick(() => document.querySelector<HTMLElement>('form [aria-invalid="true"]')?.focus())

  const handleSubmit = (fn: (data: z.output<S>) => Promise<unknown>) => async () => {
    const result = schema.safeParse(values)
    if (!result.success) {
      errors.value = issuesByField()
      Object.keys(errors.value).forEach((k) => touched.add(k))
      return focusFirstError()
    }
    errors.value = {}
    pending.value = true
    try {
      await fn(result.data)
    } catch (e) {
      errors.value = apiErrorsOf(e)
      // Server field errors stay until the user edits that field
      Object.keys(errors.value).forEach((k) => touched.delete(k))
      focusFirstError()
    } finally {
      pending.value = false
    }
  }

  /** Back to the initial values with no errors (e.g. reopening a dialog). */
  const reset = () => {
    Object.assign(values as object, initial)
    touched.clear()
    nextTick(() => (errors.value = {}))
  }

  return { values, errors, pending, validateField, handleSubmit, reset }
}
