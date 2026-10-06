/** "Buy / extend" buttons: start a Stripe checkout for a package, with a pending and an error state. */
export function useCheckout() {
  const starting = ref<string | null>(null)
  const error = ref<string>()
  async function start(plan: string) {
    starting.value = plan
    error.value = undefined
    try {
      await startCheckout(plan)
    } catch (e) {
      error.value = apiErrorsOf(e).form ?? 'Could not start the payment. Please try again.'
      starting.value = null
    }
  }
  return { starting, error, start }
}
