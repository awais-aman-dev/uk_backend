<script lang="ts">
import { h, type PropType, type VNode } from 'vue'
import type { HazardScene, SceneActor, SceneProp, SignDto } from '#shared/types/learn'
import { distanceAt, positionAt, speedAt } from '#shared/hazard/motion'
import SignGraphic from '../SignGraphic.vue'

/*
 * 2.5D "driver's eye" renderer for hazard perception clips.
 * Pure function of (scene, t): a pinhole camera moves along +z; every world point (x, y, z) in metres is projected
 * to the 1280×720 frame. Ground layers are drawn first, then props and actors sorted far → near (painter's
 * algorithm), then lighting, then emissive lights (tail lights, lamps, cat's eyes) on top of the darkness.
 */

const W = 1280
const H = 720
const HORIZON = 318
const F = 900 // focal length in px
const CAM_H = 1.22
const NEAR = 0.9
const FAR = 330

type Pt = { x: number; y: number; s: number }
type Item = { d: number; node: VNode; glow?: VNode[] }

const PALETTE = {
  day: { skyTop: '#7fb6f0', skyBottom: '#d9ecff', hills: '#9db7a6', grass: '#7aa35a', pave: '#c8c4bb', road: '#56565c', roadFar: '#8d8f96', window: '#30475e', roof: '#4d4a4f', overlay: null },
  dusk: { skyTop: '#1b2350', skyBottom: '#f0a06c', hills: '#4a3f63', grass: '#4f6a3e', pave: '#9e978d', road: '#3d3d43', roadFar: '#7c6f78', window: '#ffcf86', roof: '#3a3542', overlay: 'rgb(40 24 70 / 0.28)' },
  night: { skyTop: '#000004', skyBottom: '#0a1224', hills: '#05070d', grass: '#1d2a1a', pave: '#4a4a4c', road: '#2a2a2e', roadFar: '#16161a', window: '#ffc56b', roof: '#151519', overlay: 'rgb(0 3 14 / 0.62)' }
} as const

export default defineComponent({
  name: 'HazardStage',
  props: {
    scene: { type: Object as PropType<HazardScene>, required: true },
    t: { type: Number, required: true },
    signs: { type: Object as PropType<Record<string, SignDto>>, default: () => ({}) },
    highlight: { type: String as PropType<string | null>, default: null }
  },
  setup(props) {
    const uid = useId()
    const id = (name: string) => `${name}-${uid}`

    return () => {
      const { scene, t } = props
      const pal = PALETTE[scene.lighting]
      const night = scene.lighting === 'night'
      const camZ = distanceAt(scene.speed, t)
      const v = speedAt(scene.speed, t)
      const camX = scene.cameraX ?? -1.8
      const bob = Math.sin(camZ * 0.8) * 0.012 * Math.min(1, v / 8)
      const camY = CAM_H + bob

      const P = (x: number, y: number, z: number): Pt | null => {
        const dz = z - camZ
        if (dz < NEAR - 1e-6) return null // tolerance: clipped points land exactly on the near plane
        const s = F / Math.max(dz, NEAR)
        return { x: W / 2 + (x - camX) * s, y: HORIZON + (camY - y) * s, s }
      }
      /** Project a polygon, clipping its points against the near plane. */
      const poly = (pts: [number, number, number][]): string | null => {
        const out: string[] = []
        for (let i = 0; i < pts.length; i++) {
          const a = pts[i]!
          const b = pts[(i + 1) % pts.length]!
          const za = a[2] - camZ
          const zb = b[2] - camZ
          if (za >= NEAR) {
            const p = P(a[0], a[1], a[2])!
            out.push(`${p.x.toFixed(1)},${p.y.toFixed(1)}`)
          }
          if ((za >= NEAR) !== (zb >= NEAR)) {
            const k = (NEAR - za) / (zb - za)
            const p = P(a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, camZ + NEAR)!
            out.push(`${p.x.toFixed(1)},${p.y.toFixed(1)}`)
          }
        }
        return out.length >= 3 ? out.join(' ') : null
      }
      const quad = (pts: [number, number, number][], attrs: Record<string, unknown>) => {
        const points = poly(pts)
        return points ? h('polygon', { points, ...attrs }) : null
      }
      const fade = (dz: number) => Math.max(0, Math.min(1, (FAR - dz) / 80))

      const hw = scene.road.halfWidth
      const zNear = camZ + NEAR
      const zFar = camZ + FAR
      const ground: (VNode | null)[] = []
      const glows: VNode[] = []

      /* ---------- Sky & horizon ---------- */
      ground.push(h('rect', { width: W, height: HORIZON + 2, fill: `url(#${id('sky')})` }))
      if (night) {
        for (let i = 0; i < 40; i++) {
          const sx = (i * 397) % W
          const sy = (i * 131) % (HORIZON - 40)
          ground.push(h('circle', { cx: sx, cy: sy, r: i % 7 === 0 ? 1.4 : 0.8, fill: '#fff', opacity: 0.5 + ((i * 17) % 50) / 100 }))
        }
      }
      if (scene.lighting === 'dusk') ground.push(h('circle', { cx: W * 0.72, cy: HORIZON - 18, r: 46, fill: '#ffd6a0', opacity: 0.8 }))
      ground.push(h('path', { d: `M0 ${HORIZON} L0 ${HORIZON - 26} Q 160 ${HORIZON - 58} 330 ${HORIZON - 30} T 700 ${HORIZON - 36} T 1000 ${HORIZON - 22} T ${W} ${HORIZON - 40} L ${W} ${HORIZON} Z`, fill: pal.hills }))

      /* ---------- Ground ---------- */
      const urban = scene.road.pavement
      ground.push(h('rect', { y: HORIZON, width: W, height: H - HORIZON, fill: urban ? pal.pave : pal.grass }))

      const motorway = scene.road.markings === 'motorway'
      if (motorway) {
        // hard shoulder + verges + central barrier
        ground.push(quad([[-hw - 3.4, 0, zNear], [-hw - 3.4, 0, zFar], [-hw, 0, zFar], [-hw, 0, zNear]], { fill: pal.road, opacity: 0.92 }))
        ground.push(quad([[hw, 0, zNear], [hw, 0, zFar], [hw + 2, 0, zFar], [hw + 2, 0, zNear]], { fill: pal.road }))
      }
      if (urban) {
        // kerbs
        for (const side of [-1, 1]) {
          const x = side * hw
          ground.push(quad([[x, 0, zNear], [x, 0, zFar], [x + side * 0.18, 0.12, zFar], [x + side * 0.18, 0.12, zNear]], { fill: '#e8e5de', opacity: night ? 0.4 : 1 }))
        }
      } else if (!motorway) {
        for (const side of [-1, 1]) {
          const x = side * hw
          ground.push(quad([[x, 0, zNear], [x, 0, zFar], [x + side * 1.4, 0, zFar], [x + side * 1.4, 0, zNear]], { fill: pal.grass, opacity: 0.85 }))
        }
      }
      // carriageway
      ground.push(quad([[-hw, 0, zNear], [-hw, 0, zFar], [hw, 0, zFar], [hw, 0, zNear]], { fill: `url(#${id('road')})` }))

      // side roads
      for (const sr of scene.sideRoads ?? []) {
        const s = sr.side === 'left' ? -1 : 1
        ground.push(quad([[s * hw, 0, sr.z], [s * (hw + 80), 0, sr.z], [s * (hw + 80), 0, sr.z + sr.width], [s * hw, 0, sr.z + sr.width]], { fill: pal.road }))
        // give way lines across the mouth of the side road
        ground.push(quad([[s * (hw + 0.2), 0.01, sr.z + 0.3], [s * (hw + 0.6), 0.01, sr.z + 0.3], [s * (hw + 0.6), 0.01, sr.z + sr.width / 2], [s * (hw + 0.2), 0.01, sr.z + sr.width / 2]], { fill: '#f2f2f2', opacity: 0.8, 'stroke-dasharray': '4 4' }))
      }

      // zebra crossings
      for (const zb of scene.zebra ?? []) {
        for (let x = -hw + 0.2; x < hw; x += 1) {
          ground.push(quad([[x, 0.01, zb.z], [x, 0.01, zb.z + 3], [x + 0.5, 0.01, zb.z + 3], [x + 0.5, 0.01, zb.z]], { fill: '#f4f4f0' }))
        }
      }

      // lane markings
      const dashStart = Math.floor(zNear / 9) * 9
      const lines = motorway ? [-1.8, 1.8] : scene.road.markings === 'centre' ? [0] : []
      for (const lx of lines) {
        for (let z = dashStart; z < camZ + 200; z += 9) {
          const len = motorway ? 2 : 3
          ground.push(quad([[lx - 0.07, 0.01, z], [lx - 0.07, 0.01, z + len], [lx + 0.07, 0.01, z + len], [lx + 0.07, 0.01, z]], { fill: '#f2f2ee', opacity: 0.92 }))
        }
      }
      if (motorway) {
        for (const ex of [-hw, hw]) ground.push(quad([[ex - 0.1, 0.01, zNear], [ex - 0.1, 0.01, zFar], [ex + 0.1, 0.01, zFar], [ex + 0.1, 0.01, zNear]], { fill: ex < 0 ? '#f2f2ee' : '#f5c400', opacity: 0.9 }))
        // central reservation barrier
        ground.push(quad([[hw + 1.2, 0, zNear], [hw + 1.2, 0, zFar], [hw + 1.2, 0.8, zFar], [hw + 1.2, 0.8, zNear]], { fill: night ? '#2c2c30' : '#a7a9ad' }))
        // cat's eyes: red left edge, white lanes, amber right edge
        if (night) {
          for (let z = Math.floor(zNear / 18) * 18 + 18; z < camZ + 160; z += 18) {
            for (const [cx, col] of [[-hw + 0.25, '#ff3b30'], [-1.8, '#ffffff'], [1.8, '#ffffff'], [hw - 0.25, '#ffb000']] as const) {
              const p = P(cx, 0.02, z)
              if (p) glows.push(h('circle', { cx: p.x, cy: p.y, r: Math.min(3.5, Math.max(0.8, p.s * 0.06)), fill: col, opacity: 0.9 }))
            }
          }
        }
      }

      /* ---------- Props & actors (depth sorted) ---------- */
      const items: Item[] = []
      for (const prop of scene.props) {
        const far = prop.z + (prop.len ?? 0)
        if (far < zNear || prop.z > zFar) continue
        const item = drawProp(prop)
        if (item) items.push(item)
      }
      for (const actor of scene.actors) {
        const item = drawActor(actor)
        if (item) items.push(item)
      }
      items.sort((a, b) => b.d - a.d)
      for (const it of items) if (it.glow) glows.push(...it.glow)

      /* ---------- Compose ---------- */
      return h(
        'svg',
        { viewBox: `0 0 ${W} ${H}`, class: 'hazard-stage', preserveAspectRatio: 'xMidYMid slice', role: 'img', 'aria-label': 'Driving clip' },
        [
          h('defs', [
            h('linearGradient', { id: id('sky'), x1: 0, y1: 0, x2: 0, y2: 1 }, [
              h('stop', { offset: 0, 'stop-color': pal.skyTop }),
              h('stop', { offset: 1, 'stop-color': pal.skyBottom })
            ]),
            h('linearGradient', { id: id('road'), x1: 0, y1: 1, x2: 0, y2: 0 }, [
              h('stop', { offset: 0, 'stop-color': pal.road }),
              h('stop', { offset: 1, 'stop-color': pal.roadFar })
            ]),
            h('radialGradient', { id: id('beam'), cx: 0.5, cy: 1, r: 0.75 }, [
              h('stop', { offset: 0, 'stop-color': '#fff6dd', 'stop-opacity': 0.55 }),
              h('stop', { offset: 0.6, 'stop-color': '#fff1c9', 'stop-opacity': 0.12 }),
              h('stop', { offset: 1, 'stop-color': '#fff1c9', 'stop-opacity': 0 })
            ]),
            h('radialGradient', { id: id('glow') }, [
              h('stop', { offset: 0, 'stop-color': '#fff', 'stop-opacity': 0.9 }),
              h('stop', { offset: 1, 'stop-color': '#fff', 'stop-opacity': 0 })
            ]),
            h('radialGradient', { id: id('vignette'), cx: 0.5, cy: 0.45, r: 0.75 }, [
              h('stop', { offset: 0.6, 'stop-color': '#000', 'stop-opacity': 0 }),
              h('stop', { offset: 1, 'stop-color': '#000', 'stop-opacity': 0.45 })
            ]),
            h('linearGradient', { id: id('bonnet'), x1: 0, y1: 0, x2: 0, y2: 1 }, [
              h('stop', { offset: 0, 'stop-color': night ? '#1a1a1e' : '#3a3d44' }),
              h('stop', { offset: 1, 'stop-color': '#0c0c0e' })
            ])
          ]),
          ...ground.filter(Boolean),
          ...items.map((i) => i.node),
          pal.overlay ? h('rect', { width: W, height: H, fill: pal.overlay }) : null,
          night ? h('path', { d: `M${W * 0.08} ${H} L${W * 0.42} ${HORIZON + 30} L${W * 0.58} ${HORIZON + 30} L${W * 0.92} ${H} Z`, fill: `url(#${id('beam')})`, style: 'mix-blend-mode: screen' }) : null,
          ...glows,
          scene.rain ? rain() : null,
          // bonnet
          h('path', { d: `M0 ${H} L0 ${H - 22} Q ${W / 2} ${H - 92} ${W} ${H - 22} L ${W} ${H} Z`, fill: `url(#${id('bonnet')})` }),
          h('path', { d: `M${W * 0.2} ${H - 40} Q ${W / 2} ${H - 88} ${W * 0.8} ${H - 40}`, fill: 'none', stroke: '#fff', 'stroke-opacity': 0.08, 'stroke-width': 3 }),
          h('rect', { width: W, height: H, fill: `url(#${id('vignette')})`, 'pointer-events': 'none' })
        ]
      )

      /* ======================= drawing helpers ======================= */

      function rain(): VNode {
        const off = (t * 1.6) % 80
        const drops: VNode[] = []
        for (let i = 0; i < 90; i++) {
          const x = (i * 157) % W
          const y = ((i * 89) % H) + off - 80
          drops.push(h('line', { x1: x, y1: y, x2: x - 6, y2: y + 22, stroke: '#cfd8e6', 'stroke-opacity': 0.35, 'stroke-width': 1.2 }))
        }
        return h('g', drops)
      }

      function wall(x: number, z0: number, z1: number, y0: number, y1: number, attrs: Record<string, unknown>) {
        return quad([[x, y0, z0], [x, y0, z1], [x, y1, z1], [x, y1, z0]], attrs)
      }

      function drawProp(p: SceneProp): Item | null {
        const side = p.x < 0 ? -1 : 1
        const z0 = Math.max(p.z, zNear)
        const z1 = p.z + (p.len ?? 0)
        const dz = (p.len ? Math.max(z0, p.z) : p.z) - camZ
        const op = fade(dz)
        if (op <= 0) return null

        switch (p.kind) {
          case 'house':
          case 'shop':
          case 'school': {
            const hgt = p.h ?? 6
            const color = p.color ?? '#c9b9a0'
            const parts: (VNode | null)[] = []
            const glow: VNode[] = []
            parts.push(wall(p.x, p.z, z1, 0, hgt, { fill: color }))
            // shading on the facade
            parts.push(wall(p.x, p.z, z1, 0, hgt, { fill: '#000', opacity: side < 0 ? 0.05 : 0.14 }))
            // roof slopes away from the road
            parts.push(quad([[p.x, hgt, p.z], [p.x, hgt, z1], [p.x + side * 3.2, hgt + 2.6, z1], [p.x + side * 3.2, hgt + 2.6, p.z]], { fill: pal.roof }))
            const len = z1 - p.z
            if (dz < 170) {
              const lit = scene.lighting !== 'day'
              if (p.kind === 'shop') {
                // shop window + coloured fascia band above it
                parts.push(wall(p.x, p.z + 0.6, z1 - 0.6, 0.3, 2.5, { fill: lit ? '#f7cf8f' : '#3b5268', opacity: 0.95 }))
                parts.push(wall(p.x, p.z + 0.2, z1 - 0.2, 2.75, 3.3, { fill: ['#0a84ff', '#ff375f', '#30d158', '#ff9f0a', '#5e5ce6'][Math.abs(Math.round(p.z)) % 5] }))
                if (lit && dz < 90) glow.push(...lightPatch(p.x - side * 0.6, 0.2, (p.z + z1) / 2, 1.4, '#ffcf8a'))
              } else {
                const floors = hgt > 7 ? 2 : hgt > 5 ? 2 : 1
                for (let f = 0; f < floors; f++) {
                  const y0 = 1.1 + f * 2.7
                  for (let wz = p.z + 1.2; wz < z1 - 1.4; wz += p.kind === 'school' ? 2.6 : 3.4) {
                    const on = lit && (Math.round(wz * 7 + f) % 3 !== 0)
                    parts.push(wall(p.x, wz, wz + (p.kind === 'school' ? 2 : 1.4), y0, y0 + 1.3, { fill: on ? pal.window : lit ? '#23262d' : pal.window, opacity: 0.95 }))
                  }
                }
                if (p.kind === 'house' && len > 6) parts.push(wall(p.x, p.z + len / 2 - 0.5, p.z + len / 2 + 0.5, 0, 2.1, { fill: '#2b2f36' }))
              }
            }
            return { d: dz + 0.01, node: h('g', { opacity: op }, parts.filter(Boolean)), glow }
          }
          case 'hedge': {
            const hgt = p.h ?? 2
            return {
              d: Math.max(z0, p.z) - camZ + 0.02,
              node: h('g', { opacity: op }, [
                wall(p.x, p.z, z1, 0, hgt, { fill: night ? '#0f1a0d' : '#3e6b33' }),
                quad([[p.x, hgt, p.z], [p.x, hgt, z1], [p.x + side * 1.2, hgt, z1], [p.x + side * 1.2, hgt, p.z]], { fill: night ? '#13210f' : '#4f7f3f' })
              ])
            }
          }
          case 'fence': {
            const hgt = p.h ?? 1.2
            return {
              d: Math.max(z0, p.z) - camZ + 0.02,
              node: h('g', { opacity: op }, [
                wall(p.x, p.z, z1, 0.05, hgt, { fill: '#1d2a1f', opacity: 0.35 }),
                wall(p.x, p.z, z1, hgt - 0.08, hgt, { fill: '#1d2a1f' })
              ])
            }
          }
          default:
            return billboardProp(p, dz, op)
        }
      }

      function lightPatch(x: number, y: number, z: number, r: number, color: string): VNode[] {
        const c = P(x, y, z)
        if (!c) return []
        return [h('ellipse', { cx: c.x, cy: c.y, rx: r * c.s, ry: r * c.s * 0.35, fill: color, opacity: 0.12 })]
      }

      function billboardProp(p: SceneProp, dz: number, op: number): Item | null {
        const base = P(p.x, 0, p.z)
        if (!base) return null
        const s = base.s
        const parts: VNode[] = []
        const glow: VNode[] = []
        switch (p.kind) {
          case 'tree': {
            const hgt = p.h ?? 7
            const leaf = night ? '#0e1a10' : scene.lighting === 'dusk' ? '#2f4a2c' : '#4f8a3c'
            const leaf2 = night ? '#0b140c' : scene.lighting === 'dusk' ? '#263d24' : '#3f7431'
            parts.push(h('rect', { x: base.x - 0.18 * s, y: base.y - hgt * 0.55 * s, width: 0.36 * s, height: hgt * 0.55 * s, fill: '#4b3a2c' }))
            parts.push(h('circle', { cx: base.x, cy: base.y - hgt * 0.68 * s, r: hgt * 0.26 * s, fill: leaf }))
            parts.push(h('circle', { cx: base.x - hgt * 0.16 * s, cy: base.y - hgt * 0.58 * s, r: hgt * 0.19 * s, fill: leaf2 }))
            parts.push(h('circle', { cx: base.x + hgt * 0.17 * s, cy: base.y - hgt * 0.6 * s, r: hgt * 0.2 * s, fill: leaf2 }))
            break
          }
          case 'lamp': {
            const top = P(p.x, 6, p.z)!
            const arm = P(p.x - Math.sign(p.x) * 1.3, 6, p.z)!
            parts.push(h('line', { x1: base.x, y1: base.y, x2: top.x, y2: top.y, stroke: '#3a3d42', 'stroke-width': Math.max(1, 0.14 * s) }))
            parts.push(h('line', { x1: top.x, y1: top.y, x2: arm.x, y2: arm.y, stroke: '#3a3d42', 'stroke-width': Math.max(1, 0.1 * s) }))
            parts.push(h('rect', { x: arm.x - 0.3 * s, y: arm.y, width: 0.6 * s, height: 0.14 * s, fill: '#d9d9d9' }))
            if (scene.lighting !== 'day') {
              glow.push(h('circle', { cx: arm.x, cy: arm.y + 0.1 * s, r: 1.6 * s, fill: '#ffd28a', opacity: 0.35 }))
              glow.push(h('circle', { cx: arm.x, cy: arm.y + 0.1 * s, r: 0.35 * s, fill: '#fff4d6' }))
            }
            break
          }
          case 'beacon': {
            const top = P(p.x, 2.6, p.z)!
            parts.push(h('line', { x1: base.x, y1: base.y, x2: top.x, y2: top.y, stroke: '#222', 'stroke-width': Math.max(1, 0.12 * s), 'stroke-dasharray': `${0.3 * s} ${0.3 * s}` }))
            const on = Math.floor(t / 500) % 2 === 0
            const ball = h('circle', { cx: top.x, cy: top.y - 0.2 * s, r: Math.max(1.5, 0.22 * s), fill: on ? '#ffb000' : '#8a5a00' })
            parts.push(ball)
            if (on && scene.lighting !== 'day') glow.push(h('circle', { cx: top.x, cy: top.y - 0.2 * s, r: 0.9 * s, fill: '#ffb000', opacity: 0.4 }))
            break
          }
          case 'busStop': {
            parts.push(h('rect', { x: base.x - 1.6 * s, y: base.y - 2.5 * s, width: 3.2 * s, height: 2.5 * s, fill: '#cfe3f5', opacity: 0.35, stroke: '#3a3d42', 'stroke-width': Math.max(1, 0.06 * s) }))
            parts.push(h('rect', { x: base.x - 1.7 * s, y: base.y - 2.65 * s, width: 3.4 * s, height: 0.18 * s, fill: '#3a3d42' }))
            break
          }
          case 'sign': {
            const spec = p.sign ? props.signs[p.sign]?.spec : undefined
            const top = P(p.x, 2.4, p.z)!
            parts.push(h('line', { x1: base.x, y1: base.y, x2: top.x, y2: top.y, stroke: '#8e8e93', 'stroke-width': Math.max(1, 0.08 * s) }))
            if (spec) {
              const size = 0.8 * s
              parts.push(h(SignGraphic, { spec, size, x: top.x - size / 2, y: top.y - size * 0.9, height: size, label: props.signs[p.sign!]!.name }))
            }
            break
          }
          case 'parkedCar':
            return vehicle({ kind: 'car', color: p.color, view: p.view ?? 'rear' }, p.x, p.z, 0)
          default:
            return null
        }
        return { d: dz, node: h('g', { opacity: op }, parts), glow }
      }

      function drawActor(a: SceneActor): Item | null {
        if (t < a.keys[0]![0] && a.kind === 'ball') return null
        const pos = positionAt(a.keys, t)
        const dz = pos.z - camZ
        if (dz < NEAR || dz > FAR) return null
        const moving = Math.hypot(pos.vx, pos.vz) > 0.2
        const view = a.view ?? (Math.abs(pos.vx) > Math.abs(pos.vz) + 0.2 ? 'side' : pos.vz < -0.2 ? 'front' : 'rear')
        const highlighted = props.highlight === a.id
        let item: Item | null = null
        switch (a.kind) {
          case 'pedestrian':
          case 'child':
            item = person(a, pos.x, pos.z, moving)
            break
          case 'cyclist':
            item = cyclist(a, pos.x, pos.z, view, moving)
            break
          case 'horse':
            item = horse(a, pos.x, pos.z, moving)
            break
          case 'ball': {
            const p = P(pos.x, 0.12 + Math.abs(Math.sin(t / 160)) * 0.35, pos.z)
            if (!p) return null
            item = { d: dz, node: h('g', [h('ellipse', { cx: p.x, cy: P(pos.x, 0, pos.z)!.y, rx: 0.14 * p.s, ry: 0.04 * p.s, fill: '#000', opacity: 0.25 }), h('circle', { cx: p.x, cy: p.y, r: Math.max(1.2, 0.13 * p.s), fill: a.color ?? '#ff3b30' })]) }
            break
          }
          default:
            item = vehicle(a, pos.x, pos.z, pos.vx, view)
        }
        if (item && highlighted) {
          const p = P(pos.x, 0.9, pos.z)
          if (p) {
            const r = Math.max(26, 1.6 * p.s)
            item.glow = [...(item.glow ?? []), h('circle', { cx: p.x, cy: p.y, r, fill: 'none', stroke: '#ffb000', 'stroke-width': 3, class: 'hazard-ring' })]
          }
        }
        return fadeItem(item, dz)
      }

      function fadeItem(item: Item | null, dz: number) {
        if (!item) return null
        const op = fade(dz)
        if (op < 1) item.node = h('g', { opacity: op }, [item.node])
        return item
      }

      function shadow(x: number, z: number, w: number, depth = 0.6) {
        const a = P(x, 0, z)
        if (!a) return null
        return h('ellipse', { cx: a.x, cy: a.y, rx: (w / 2 + 0.15) * a.s, ry: depth * 0.18 * a.s, fill: '#000', opacity: night ? 0.5 : 0.28 })
      }

      function person(a: SceneActor, x: number, z: number, moving: boolean): Item | null {
        const tall = a.kind === 'child' ? 1.15 : 1.74
        const base = P(x, 0, z)
        if (!base) return null
        const s = base.s
        const u = (m: number) => m * s
        const swing = moving ? Math.sin(t / 140 + x) * 0.18 : 0
        const hip = { x: base.x, y: base.y - u(tall * 0.5) }
        const neck = { x: base.x, y: base.y - u(tall * 0.83) }
        const coat = a.color ?? '#5e5ce6'
        const limb = { stroke: '#2a2a30', 'stroke-width': Math.max(1, u(0.11)), 'stroke-linecap': 'round' }
        return {
          d: z - camZ,
          node: h('g', [
            shadow(x, z, 0.5),
            h('line', { x1: hip.x, y1: hip.y, x2: hip.x - u(swing), y2: base.y, ...limb }),
            h('line', { x1: hip.x, y1: hip.y, x2: hip.x + u(swing), y2: base.y, ...limb }),
            h('rect', { x: base.x - u(0.2), y: neck.y, width: u(0.4), height: hip.y - neck.y + u(0.05), rx: u(0.12), fill: coat }),
            h('line', { x1: base.x - u(0.18), y1: neck.y + u(0.06), x2: base.x - u(0.24) + u(swing * 0.6), y2: hip.y + u(0.04), ...limb, stroke: coat }),
            h('line', { x1: base.x + u(0.18), y1: neck.y + u(0.06), x2: base.x + u(0.24) - u(swing * 0.6), y2: hip.y + u(0.04), ...limb, stroke: coat }),
            h('circle', { cx: base.x, cy: neck.y - u(0.12), r: u(0.12), fill: '#e0b693' }),
            h('path', { d: `M${base.x - u(0.12)} ${neck.y - u(0.14)} a ${u(0.12)} ${u(0.12)} 0 0 1 ${u(0.24)} 0`, fill: '#3b2a20' })
          ])
        }
      }

      function cyclist(a: SceneActor, x: number, z: number, view: string, moving: boolean): Item | null {
        const base = P(x, 0, z)
        if (!base) return null
        const s = base.s
        const u = (m: number) => m * s
        const jacket = a.color ?? '#ff9f0a'
        const pedal = moving ? Math.sin(t / 120) * 0.12 : 0
        const glow: VNode[] = []
        let parts: (VNode | null)[]
        if (view === 'side') {
          parts = [
            shadow(x, z, 1.6),
            h('circle', { cx: base.x - u(0.55), cy: base.y - u(0.34), r: u(0.34), fill: 'none', stroke: '#1d1d1f', 'stroke-width': Math.max(1, u(0.05)) }),
            h('circle', { cx: base.x + u(0.55), cy: base.y - u(0.34), r: u(0.34), fill: 'none', stroke: '#1d1d1f', 'stroke-width': Math.max(1, u(0.05)) }),
            h('path', { d: `M${base.x - u(0.55)} ${base.y - u(0.34)} L${base.x - u(0.1)} ${base.y - u(0.9)} L${base.x + u(0.45)} ${base.y - u(0.95)} L${base.x + u(0.55)} ${base.y - u(0.34)}`, fill: 'none', stroke: '#0a84ff', 'stroke-width': Math.max(1, u(0.06)) }),
            h('rect', { x: base.x - u(0.25), y: base.y - u(1.55), width: u(0.42), height: u(0.65), rx: u(0.15), fill: jacket, transform: `rotate(20 ${base.x} ${base.y - u(1.2)})` }),
            h('circle', { cx: base.x + u(0.12), cy: base.y - u(1.7), r: u(0.13), fill: '#1d1d1f' })
          ]
        } else {
          parts = [
            shadow(x, z, 0.6),
            h('rect', { x: base.x - u(0.04), y: base.y - u(0.66), width: u(0.08), height: u(0.66), rx: u(0.04), fill: '#1d1d1f' }),
            h('line', { x1: base.x - u(0.12), y1: base.y - u(0.55 + pedal), x2: base.x - u(0.1), y2: base.y - u(0.95), stroke: '#2a2a30', 'stroke-width': Math.max(1, u(0.1)), 'stroke-linecap': 'round' }),
            h('line', { x1: base.x + u(0.12), y1: base.y - u(0.55 - pedal), x2: base.x + u(0.1), y2: base.y - u(0.95), stroke: '#2a2a30', 'stroke-width': Math.max(1, u(0.1)), 'stroke-linecap': 'round' }),
            h('rect', { x: base.x - u(0.24), y: base.y - u(1.55), width: u(0.48), height: u(0.65), rx: u(0.16), fill: jacket }),
            h('rect', { x: base.x - u(0.24), y: base.y - u(1.12), width: u(0.48), height: u(0.07), fill: '#e5e5ea', opacity: 0.85 }),
            h('ellipse', { cx: base.x, cy: base.y - u(1.72), rx: u(0.15), ry: u(0.13), fill: '#f2f2f7' })
          ]
          const lamp = P(x, 0.55, z)
          if (lamp) {
            parts.push(h('rect', { x: lamp.x - u(0.05), y: lamp.y - u(0.05), width: u(0.1), height: u(0.08), fill: '#ff3b30' }))
            if (scene.lighting !== 'day') glow.push(h('circle', { cx: lamp.x, cy: lamp.y, r: u(0.3), fill: '#ff3b30', opacity: 0.6 }))
          }
        }
        return { d: z - camZ, node: h('g', parts.filter(Boolean) as VNode[]), glow }
      }

      function horse(a: SceneActor, x: number, z: number, moving: boolean): Item | null {
        const base = P(x, 0, z)
        if (!base) return null
        const s = base.s
        const u = (m: number) => m * s
        const step = moving ? Math.sin(t / 220) * 0.06 : 0
        const coat = a.color ?? '#7a4b2a'
        return {
          d: z - camZ,
          node: h('g', [
            shadow(x, z, 0.9, 1.4),
            ...[-0.22, 0.22].map((dx, i) => h('rect', { x: base.x + u(dx) - u(0.06), y: base.y - u(1.05 + (i ? step : -step)), width: u(0.12), height: u(1.05 + (i ? step : -step)), fill: '#3d2716' })),
            h('ellipse', { cx: base.x, cy: base.y - u(1.25), rx: u(0.36), ry: u(0.42), fill: coat }),
            h('path', { d: `M${base.x - u(0.06)} ${base.y - u(1.2)} q ${u(-0.1)} ${u(0.5)} ${u(-0.05)} ${u(0.75)}`, stroke: '#2a1a0e', 'stroke-width': u(0.08), fill: 'none' }),
            // rider in a hi-vis vest
            h('rect', { x: base.x - u(0.22), y: base.y - u(2.25), width: u(0.44), height: u(0.62), rx: u(0.14), fill: '#d7f740' }),
            h('rect', { x: base.x - u(0.22), y: base.y - u(1.98), width: u(0.44), height: u(0.06), fill: '#c7c7cc' }),
            h('ellipse', { cx: base.x, cy: base.y - u(2.42), rx: u(0.14), ry: u(0.13), fill: '#1d1d1f' })
          ])
        }
      }

      function vehicle(
        a: { kind: string; color?: string; view?: string; brakeAt?: number; doorAt?: number },
        x: number,
        z: number,
        vx: number,
        viewOverride?: string
      ): Item | null {
        const view = viewOverride ?? a.view ?? 'rear'
        const dims =
          a.kind === 'bus' ? { w: 2.55, hgt: 3.2, len: 11 } : a.kind === 'van' ? { w: 2.05, hgt: 2.5, len: 5.5 } : a.kind === 'tractor' ? { w: 2.2, hgt: 2.8, len: 4 } : { w: 1.82, hgt: 1.45, len: 4.4 }
        const base = P(x, 0, z)
        if (!base) return null
        const s = base.s
        const u = (m: number) => m * s
        const body = a.color ?? '#8e8e93'
        const braking = a.brakeAt !== undefined && t >= a.brakeAt
        const parts: (VNode | null)[] = [shadow(x, z, view === 'side' ? dims.len : dims.w, view === 'side' ? 1.6 : 1)]
        const glow: VNode[] = []
        const lightsOn = scene.lighting !== 'day'

        if (view === 'side') {
          const dir = vx >= 0 ? 1 : -1
          const L = u(dims.len)
          const left = base.x - L / 2
          parts.push(h('rect', { x: left, y: base.y - u(dims.hgt * 0.62), width: L, height: u(dims.hgt * 0.5), rx: u(0.25), fill: body }))
          if (a.kind === 'bus') {
            parts.push(h('rect', { x: left, y: base.y - u(dims.hgt), width: L, height: u(dims.hgt * 0.9), rx: u(0.3), fill: body }))
            for (let i = 0; i < 6; i++) parts.push(h('rect', { x: left + u(0.6 + i * 1.75), y: base.y - u(2.7), width: u(1.4), height: u(0.9), rx: u(0.1), fill: '#1c2a38' }))
          } else {
            parts.push(h('path', { d: `M${left + L * 0.22} ${base.y - u(dims.hgt * 0.6)} L${left + L * 0.32} ${base.y - u(dims.hgt)} L${left + L * 0.7} ${base.y - u(dims.hgt)} L${left + L * 0.82} ${base.y - u(dims.hgt * 0.6)} Z`, fill: body }))
            parts.push(h('path', { d: `M${left + L * 0.27} ${base.y - u(dims.hgt * 0.62)} L${left + L * 0.35} ${base.y - u(dims.hgt * 0.93)} L${left + L * 0.67} ${base.y - u(dims.hgt * 0.93)} L${left + L * 0.76} ${base.y - u(dims.hgt * 0.62)} Z`, fill: '#1c2a38' }))
          }
          for (const wx of [0.2, 0.8]) parts.push(h('circle', { cx: left + L * wx, cy: base.y - u(0.32), r: u(0.32), fill: '#111' }))
          const front = dir > 0 ? left + L : left
          parts.push(h('rect', { x: front - u(0.12), y: base.y - u(0.75), width: u(0.24), height: u(0.16), fill: '#fff4d6' }))
          if (lightsOn) glow.push(h('circle', { cx: front, cy: base.y - u(0.68), r: u(0.5), fill: '#fff4d6', opacity: 0.5 }))
          return { d: z - camZ, node: h('g', parts.filter(Boolean) as VNode[]), glow }
        }

        const w = u(dims.w)
        const hgt = u(dims.hgt)
        const left = base.x - w / 2
        if (a.kind === 'tractor') {
          parts.push(h('rect', { x: left + w * 0.2, y: base.y - hgt, width: w * 0.6, height: hgt * 0.62, rx: u(0.1), fill: '#cfe3f5', opacity: 0.6, stroke: body, 'stroke-width': u(0.1) }))
          parts.push(h('rect', { x: left + w * 0.15, y: base.y - hgt * 0.45, width: w * 0.7, height: hgt * 0.25, fill: body }))
          parts.push(h('rect', { x: left - u(0.05), y: base.y - u(1.5), width: u(0.55), height: u(1.5), rx: u(0.2), fill: '#151515' }))
          parts.push(h('rect', { x: left + w - u(0.5), y: base.y - u(1.5), width: u(0.55), height: u(1.5), rx: u(0.2), fill: '#151515' }))
          const on = Math.floor(t / 400) % 2 === 0
          parts.push(h('rect', { x: base.x - u(0.12), y: base.y - hgt - u(0.18), width: u(0.24), height: u(0.18), rx: u(0.05), fill: on ? '#ffb000' : '#8a5a00' }))
          if (on) glow.push(h('circle', { cx: base.x, cy: base.y - hgt - u(0.1), r: u(0.6), fill: '#ffb000', opacity: lightsOn ? 0.55 : 0.3 }))
          return { d: z - camZ, node: h('g', parts.filter(Boolean) as VNode[]), glow }
        }

        // rear / front of a car, van or bus
        const cabin = a.kind === 'car' ? 0.45 : 0.35
        parts.push(h('rect', { x: left, y: base.y - hgt * (1 - cabin) - u(0.15), width: w, height: hgt * (1 - cabin), rx: u(0.18), fill: body }))
        parts.push(h('path', { d: `M${left + w * 0.06} ${base.y - hgt * (1 - cabin) - u(0.1)} L${left + w * 0.16} ${base.y - hgt} L${left + w * 0.84} ${base.y - hgt} L${left + w * 0.94} ${base.y - hgt * (1 - cabin) - u(0.1)} Z`, fill: body }))
        parts.push(h('path', { d: `M${left + w * 0.13} ${base.y - hgt * (1 - cabin) - u(0.14)} L${left + w * 0.2} ${base.y - hgt * 0.95} L${left + w * 0.8} ${base.y - hgt * 0.95} L${left + w * 0.87} ${base.y - hgt * (1 - cabin) - u(0.14)} Z`, fill: view === 'front' ? '#2a3b4c' : '#1c2733' }))
        // wheels peeking out
        parts.push(h('rect', { x: left + u(0.05), y: base.y - u(0.2), width: u(0.32), height: u(0.2), fill: '#0d0d0d' }))
        parts.push(h('rect', { x: left + w - u(0.37), y: base.y - u(0.2), width: u(0.32), height: u(0.2), fill: '#0d0d0d' }))
        const ly = base.y - hgt * 0.42
        if (view === 'front') {
          for (const lx of [left + u(0.12), left + w - u(0.42)]) parts.push(h('rect', { x: lx, y: ly, width: u(0.3), height: u(0.12), rx: u(0.04), fill: '#f2f4f8' }))
          parts.push(h('rect', { x: base.x - u(0.26), y: base.y - u(0.42), width: u(0.52), height: u(0.12), fill: '#f5f5f5' }))
          if (lightsOn) {
            for (const lx of [left + u(0.27), left + w - u(0.27)]) {
              glow.push(h('circle', { cx: lx, cy: ly + u(0.06), r: u(0.9), fill: '#fff6dd', opacity: 0.35 }))
              glow.push(h('circle', { cx: lx, cy: ly + u(0.06), r: u(0.16), fill: '#ffffff' }))
            }
          }
        } else {
          for (const lx of [left + u(0.08), left + w - u(0.38)]) parts.push(h('rect', { x: lx, y: ly, width: u(0.3), height: u(0.14), rx: u(0.04), fill: braking ? '#ff2d20' : '#a3141b' }))
          parts.push(h('rect', { x: base.x - u(0.26), y: base.y - u(0.42), width: u(0.52), height: u(0.12), fill: '#ffd60a' }))
          if (lightsOn || braking) {
            for (const lx of [left + u(0.23), left + w - u(0.23)]) {
              glow.push(h('circle', { cx: lx, cy: ly + u(0.07), r: u(braking ? 0.7 : 0.4), fill: '#ff2d20', opacity: braking ? 0.6 : 0.4 }))
              glow.push(h('circle', { cx: lx, cy: ly + u(0.07), r: u(0.1), fill: braking ? '#ffd0cc' : '#ff6b60' }))
            }
            if (braking) glow.push(h('rect', { x: base.x - u(0.25), y: base.y - hgt * 0.97, width: u(0.5), height: u(0.05), fill: '#ff2d20' }))
          }
        }
        // a door swinging open into the road (driver's side = right in the UK)
        if (a.doorAt !== undefined && t >= a.doorAt) {
          const k = Math.min(1, (t - a.doorAt) / 600)
          const hinge = P(x + dims.w / 2, 0.25, z)
          const tip = P(x + dims.w / 2 + 0.95 * k, 0.25, z + 0.4 * (1 - k))
          const top = P(x + dims.w / 2 + 0.95 * k, 1.2, z + 0.4 * (1 - k))
          const hingeTop = P(x + dims.w / 2, 1.2, z)
          if (hinge && tip && top && hingeTop) {
            parts.push(h('polygon', { points: `${hinge.x},${hinge.y} ${tip.x},${tip.y} ${top.x},${top.y} ${hingeTop.x},${hingeTop.y}`, fill: body, stroke: '#00000033', 'stroke-width': 1 }))
          }
        }
        return { d: z - camZ, node: h('g', parts.filter(Boolean) as VNode[]), glow }
      }
    }
  }
})
</script>

<style scoped>
.hazard-stage {
  display: block;
  width: 100%;
  height: 100%;
  background: #000;
  user-select: none;
}
.hazard-stage :deep(.hazard-ring) {
  animation: ring 1.2s ease-out infinite;
  transform-box: fill-box;
  transform-origin: center;
}
@keyframes ring {
  0% { opacity: 1; transform: scale(0.8); }
  100% { opacity: 0.2; transform: scale(1.25); }
}
</style>
