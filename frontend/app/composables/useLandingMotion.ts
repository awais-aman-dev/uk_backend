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

        /* Hero intro: the title words rise in 3D, the lights run red → amber → green, then the car rolls in */
        const words = q('.hero__title .w')
        const lights = one('.road .lights')
        const spins = q('.road .wheel__spin')
        const car = one('.road .car')
        const track = one('.road .car-track')
        // Wheels turn by the distance actually travelled (no slipping), about their own axle (svgOrigin 0 0)
        const rollWheels = () => {
          if (!car || !track) return
          const travelled = Number(gsap.getProperty(car, 'x')) + Number(gsap.getProperty(track, 'x'))
          const wheelPx = 2 * Math.PI * 12 * (car.getBoundingClientRect().width / 170)
          gsap.set(spins, { rotation: (travelled / wheelPx) * 360, svgOrigin: '0 0' })
        }
        const setLight = (state: string) => () => void (lights && (lights.dataset.light = state))
        gsap.set(words, { animation: 'none' })
        const intro = gsap.timeline({ delay: 0.1 })
        intro
          .fromTo(words, { opacity: 0, y: 46, rotateX: -70, transformPerspective: 700, transformOrigin: '50% 100%' }, { opacity: 1, y: 0, rotateX: 0, duration: 0.9, ease: 'power3.out', stagger: 0.055 }, 0)
          .fromTo(one('.w--mark'), { '--mark': 0 }, { '--mark': 1, duration: 0.6, ease: 'power2.inOut' }, 0.7)
          .call(setLight('red'), undefined, 0)
          .call(setLight('amber'), undefined, 1.0)
          .call(setLight('green'), undefined, 1.6)
          .fromTo(car, { x: desktop ? -320 : -200 }, { x: 0, duration: 1.5, ease: 'power2.out', onUpdate: () => rollWheels() }, 1.65)

        /* Hero on scroll: the car drives on along the road, wheels turning; the copy lifts away */
        const road = one('.hero .road')
        if (road && track) {
          gsap.to(track, {
            x: () => road.clientWidth * (desktop ? 0.7 : 0.55),
            ease: 'none',
            scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom 35%', scrub: 0.7, invalidateOnRefresh: true },
            onUpdate: () => rollWheels()
          })
        }
        gsap.to(one('.hero__copy'), { y: desktop ? -60 : -24, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } })

        /* Background signs: parallax by depth with a slow turn; on desktop they also lean towards the pointer */
        const signs = q('.float-sign')
        for (const sign of signs) {
          const depth = Number(sign.dataset.depth) || 1
          gsap.to(sign, { y: -150 * depth, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } })
        }
        const hero = one('.hero')
        if (desktop && hero && signs.length) {
          const movers = signs.map((sign) => {
            const depth = Number(sign.dataset.depth) || 1
            return { depth, x: gsap.quickTo(sign, 'x', { duration: 0.9, ease: 'power3.out' }), turn: gsap.quickTo(sign, 'rotationY', { duration: 0.9, ease: 'power3.out' }) }
          })
          const onMove = (e: PointerEvent) => {
            const dx = e.clientX / window.innerWidth - 0.5
            for (const m of movers) {
              m.x(dx * 40 * m.depth)
              m.turn(dx * 14 * m.depth)
            }
          }
          hero.addEventListener('pointermove', onMove)
          ctx.add(() => () => hero.removeEventListener('pointermove', onMove))
        }

        /* The windscreen with the live clip straightens up as you scroll */
        const drive = one('.drive')
        if (drive) {
          gsap.fromTo(
            drive,
            desktop ? { rotateY: -16, rotateX: 6, scale: 0.94, transformPerspective: 1400, transformOrigin: '0% 50%' } : { rotateX: 12, scale: 0.95, transformPerspective: 1200, transformOrigin: '50% 100%' },
            { rotateY: 0, rotateX: 0, scale: 1, ease: 'none', scrollTrigger: { trigger: drive, start: desktop ? 'top 60%' : 'top bottom', end: desktop ? 'top 5%' : 'top 30%', scrub: 0.6 } }
          )
        }

        /* Benefits: each sign swings up on its post; the lane marking draws along the road */
        for (const [i, board] of q('.board').entries()) {
          gsap.fromTo(
            board,
            { rotateX: -82, opacity: 0.3 },
            { rotateX: 0, opacity: 1, ease: 'back.out(1.4)', scrollTrigger: { trigger: board.parentElement, start: `top ${desktop ? 96 - i * 4 : 96}%`, end: `top ${desktop ? 62 - i * 4 : 70}%`, scrub: 0.5 } }
          )
        }
        const lane = one('.benefits__lane i')
        if (lane) {
          gsap.fromTo(lane, { scaleX: 0 }, { scaleX: 1, ease: 'none', scrollTrigger: { trigger: '.benefits', start: 'top 85%', end: 'bottom 70%', scrub: 0.4 } })
        }

        /* Features: on desktop, vertical scroll drives the card strip sideways while the section is pinned */
        const gallery = one('.gallery')
        const section = one('.features')
        if (desktop && gallery && section) {
          const distance = () => gallery.scrollWidth - gallery.clientWidth
          if (distance() > 80) {
            section.classList.add('features--scrub')
            gsap.to(gallery, {
              scrollLeft: () => distance(),
              ease: 'none',
              scrollTrigger: { trigger: section, start: 'top top', end: () => `+=${distance()}`, pin: true, scrub: 0.5, invalidateOnRefresh: true }
            })
            ctx.add(() => () => section.classList.remove('features--scrub'))
          }
        }

        /* Steps: the lane draws down past the steps; each step rises in (vertically, so its dot stays on the lane) */
        const stepLane = one('.steps__lane i')
        if (stepLane) {
          gsap.fromTo(stepLane, { scaleY: 0 }, { scaleY: 1, ease: 'none', scrollTrigger: { trigger: '.steps__list', start: 'top 70%', end: 'bottom 60%', scrub: 0.4 } })
        }
        for (const step of q('.step')) {
          gsap.fromTo(step, { y: desktop ? 50 : 24 }, { y: 0, ease: 'power2.out', scrollTrigger: { trigger: step, start: 'top 95%', end: 'top 65%', scrub: 0.5 } })
        }

        /* Pricing: the night lane draws across */
        const nightLane = one('.pricing__lane i')
        if (nightLane) {
          gsap.fromTo(nightLane, { scaleX: 0 }, { scaleX: 1, ease: 'none', scrollTrigger: { trigger: nightLane, start: 'top bottom', end: 'top 60%', scrub: 0.4 } })
        }

        /* Final CTA: the light runs red → red + amber → green as the section arrives (and resets above it) */
        const finalLights = one('.final .lights')
        if (finalLights) {
          const set = (state: string) => () => void (finalLights.dataset.light = state)
          const go = gsap.timeline({ paused: true }).call(set('red'), undefined, 0).call(set('red-amber'), undefined, 0.8).call(set('green'), undefined, 1.6)
          ScrollTrigger.create({ trigger: '.final', start: 'top 65%', onEnter: () => go.restart(), onLeaveBack: () => { go.pause(0); set('red')() } })
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

    // Reduced motion: no light sequences — the scenery lights are simply green
    mm.add('(prefers-reduced-motion: reduce)', () => {
      for (const lights of q('.road .lights, .final .lights')) lights.dataset.light = 'green'
    })

    // Steps (for everyone — it's a colour change, not motion): the sticky light follows the step in view
    mm.add('all', () => {
      const light = one('.steps__light')
      const steps = q('.step')
      const cues = q('.steps__cue span')
      if (!light || !steps.length) return
      const activate = (i: number) => {
        light.dataset.light = steps[i]!.dataset.light ?? 'red'
        steps.forEach((s, j) => s.classList.toggle('is-active', j === i))
        cues.forEach((c, j) => c.classList.toggle('is-on', j === i))
      }
      steps.forEach((step, i) => {
        ScrollTrigger.create({ trigger: step, start: 'top 62%', end: 'bottom 62%', onToggle: (self) => self.isActive && activate(i) })
      })
    })

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
