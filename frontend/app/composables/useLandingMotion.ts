/*
 * Scroll-driven motion for the landing page (GSAP + ScrollTrigger).
 * - GSAP is imported on demand in the browser only, so it never weighs on SSR or the first paint.
 * - gsap.matchMedia gives a desktop and a lighter mobile variant; with prefers-reduced-motion nothing runs at all.
 * - Tweens only touch elements that v-reveal doesn't animate (inner parts, wrappers), so the two never fight.
 * - Everything is reverted when the page unmounts.
 */
export function useLandingMotion(root: Ref<HTMLElement | undefined>) {
  let revert: (() => void) | undefined
  let resizeObserver: ResizeObserver | undefined

  onMounted(async () => {
    const el = root.value
    if (!el) return
    const [{ gsap }, { ScrollTrigger }] = await Promise.all([import('gsap'), import('gsap/ScrollTrigger')])
    gsap.registerPlugin(ScrollTrigger)
    if (!root.value) return // left the page while loading

    const q = <T extends Element = HTMLElement>(sel: string) => [...el.querySelectorAll<T>(sel)]
    const one = <T extends Element = HTMLElement>(sel: string) => el.querySelector<T>(sel)
    const mm = gsap.matchMedia()

    mm.add(
      {
        desktop: '(min-width: 768px) and (prefers-reduced-motion: no-preference)',
        mobile: '(max-width: 767px) and (prefers-reduced-motion: no-preference)'
      },
      (ctx) => {
        const { desktop } = ctx.conditions as { desktop: boolean; mobile: boolean }

        /* Hero: the windscreen rises from a tilt as you scroll; the aurora drifts slower than the page */
        const drive = one('.drive')
        if (drive) {
          gsap.fromTo(
            drive,
            { rotateX: desktop ? 24 : 14, scale: desktop ? 0.88 : 0.94, y: desktop ? 40 : 16, transformPerspective: 1400, transformOrigin: '50% 100%' },
            { rotateX: 0, scale: 1, y: 0, ease: 'none', scrollTrigger: { trigger: drive, start: 'top bottom', end: desktop ? 'top 18%' : 'top 30%', scrub: 0.6 } }
          )
        }
        gsap.to(q('.hero .aurora'), { yPercent: 28, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } })

        /* Features: on desktop, vertical scroll drives the card strip sideways while the section is pinned */
        const track = one('.gallery')
        const section = one('.features')
        if (desktop && track && section) {
          const distance = () => track.scrollWidth - track.clientWidth
          if (distance() > 80) {
            section.classList.add('features--scrub')
            gsap.to(track, {
              scrollLeft: () => distance(),
              ease: 'none',
              scrollTrigger: { trigger: section, start: 'top top', end: () => `+=${distance()}`, pin: true, scrub: 0.5, invalidateOnRefresh: true }
            })
            ctx.add(() => () => section.classList.remove('features--scrub'))
          }
        }

        /* Steps: a line draws through the steps; the big numerals drift */
        const line = one('.steps__line i')
        if (line) {
          gsap.fromTo(line, { scaleX: 0 }, { scaleX: 1, ease: 'none', scrollTrigger: { trigger: '.steps__list', start: 'top 80%', end: 'bottom 55%', scrub: 0.4 } })
        }
        for (const n of q('.step__n')) {
          gsap.fromTo(n, { yPercent: 30 }, { yPercent: -30, ease: 'none', scrollTrigger: { trigger: n.parentElement, start: 'top bottom', end: 'bottom top', scrub: true } })
        }

        /* Pricing: prices count up once; the glow drifts */
        for (const price of q('.plan__price strong')) {
          const target = Number(price.textContent?.replace(/[^\d.]/g, '')) || 0
          const prefix = price.textContent?.match(/^\D*/)?.[0] ?? ''
          const counter = { v: 0 }
          gsap.to(counter, {
            v: target,
            duration: 1.1,
            ease: 'power2.out',
            scrollTrigger: { trigger: price, start: 'top 88%', once: true },
            onStart: () => void (price.textContent = `${prefix}0`),
            onUpdate: () => void (price.textContent = `${prefix}${Math.round(counter.v)}`)
          })
        }
        gsap.to(q('.pricing__glow span'), { yPercent: -25, ease: 'none', scrollTrigger: { trigger: '.pricing', start: 'top bottom', end: 'bottom top', scrub: true } })

        /* Final CTA: the headline settles into place */
        const finalInner = one('.final__inner')
        if (finalInner) {
          gsap.fromTo(finalInner, { scale: desktop ? 0.86 : 0.94 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: '.final', start: 'top bottom', end: 'center center', scrub: 0.5 } })
        }
      }
    )

    // Content above can change height after load (the demo clip, fonts) — keep trigger positions honest
    let pending = 0
    resizeObserver = new ResizeObserver(() => {
      cancelAnimationFrame(pending)
      pending = requestAnimationFrame(() => ScrollTrigger.refresh())
    })
    resizeObserver.observe(el)
    revert = () => mm.revert()
  })

  onBeforeUnmount(() => {
    resizeObserver?.disconnect()
    revert?.()
  })
}
