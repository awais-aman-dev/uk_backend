import type { Directive } from 'vue'

// v-reveal / v-reveal="150" — fades an element in when it scrolls into view (delay in ms).
// State lives in data attributes (not class/style) so SSR and hydration stay identical:
//   data-reveal — element is waiting/animating; removed once done so its own transitions apply
//   data-shown  — element has been revealed (stays; components can hook animations onto it)
// The hidden state is CSS-only and requires the `js` class on <html>, so content stays visible without JS.
export default defineNuxtPlugin((nuxtApp) => {
  let observer: IntersectionObserver | undefined

  const getObserver = () => {
    observer ??= new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          const el = entry.target as HTMLElement
          el.dataset.shown = ''
          observer!.unobserve(el)
          const delay = Number(el.dataset.revealDelay) || 0
          setTimeout(() => {
            delete el.dataset.reveal
            el.style.removeProperty('--reveal-delay')
          }, delay + 900)
        }
      },
      { rootMargin: '0px 0px -10% 0px', threshold: 0.12 }
    )
    return observer
  }

  const reveal: Directive<HTMLElement, number | undefined> = {
    getSSRProps: () => ({ 'data-reveal': '' }),
    mounted(el, binding) {
      el.dataset.reveal = ''
      if (binding.value) {
        el.dataset.revealDelay = String(binding.value)
        el.style.setProperty('--reveal-delay', `${binding.value}ms`)
      }
      getObserver().observe(el)
    },
    unmounted(el) {
      observer?.unobserve(el)
    }
  }

  nuxtApp.vueApp.directive('reveal', reveal)
})
