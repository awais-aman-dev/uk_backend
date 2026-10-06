/*
 * Liquid glass: the backdrop is refracted near the edges, like light through a thick, rounded pane.
 *
 * How: for the element's exact size and corner radius we draw a displacement map on a canvas — red/green encode how
 * far, along the edge normal, each pixel samples the backdrop (strong at the rim, none in the flat middle). An SVG
 * filter (feImage → feDisplacementMap) uses that map, and the element gets `backdrop-filter: url(#filter) blur() …`.
 * The map is redrawn when the element resizes (e.g. the mobile menu opens).
 *
 * Only Chromium renders SVG filters inside backdrop-filter. Elsewhere the element keeps its CSS frosted glass
 * (blur + saturate + rim), so nothing breaks — it's just less "liquid".
 */
let defs: SVGDefsElement | null = null
let seq = 0

function svgDefs() {
  if (defs) return defs
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.setAttribute('aria-hidden', 'true')
  svg.setAttribute('style', 'position:absolute;width:0;height:0;overflow:hidden')
  defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs')
  svg.appendChild(defs)
  document.body.appendChild(svg)
  return defs
}

export const supportsLiquid = () => {
  if (!import.meta.client) return false
  const brands = (navigator as Navigator & { userAgentData?: { brands: { brand: string }[] } }).userAgentData?.brands
  return !!brands?.some((b) => /Chromium/.test(b.brand))
}

/** Displacement map for a rounded rectangle: unit edge normals scaled by a bezel curve, encoded in R/G around 0.5. */
function displacementMap(w: number, h: number, radius: number, bezel: number) {
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!
  const img = ctx.createImageData(w, h)
  const r = Math.min(radius, w / 2, h / 2)
  const hx = w / 2 - r
  const hy = h / 2 - r
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const px = x + 0.5 - w / 2
      const py = y + 0.5 - h / 2
      const qx = Math.abs(px) - hx
      const qy = Math.abs(py) - hy
      // distance from the edge, inwards, and the outward normal
      let dist: number
      let nx: number
      let ny: number
      if (qx > 0 && qy > 0) {
        const len = Math.hypot(qx, qy) || 1
        dist = r - len
        nx = (qx / len) * Math.sign(px)
        ny = (qy / len) * Math.sign(py)
      } else if (qx > qy) {
        dist = r - qx
        nx = Math.sign(px)
        ny = 0
      } else {
        dist = r - qy
        nx = 0
        ny = Math.sign(py)
      }
      // convex bezel: strongest at the rim, fading to zero `bezel` px in
      const t = Math.max(0, Math.min(1, 1 - dist / bezel))
      const m = t * t * (3 - 2 * t)
      const i = (y * w + x) * 4
      img.data[i] = Math.round(127.5 + 127.5 * nx * m)
      img.data[i + 1] = Math.round(127.5 + 127.5 * ny * m)
      img.data[i + 2] = 128
      img.data[i + 3] = 255
    }
  }
  ctx.putImageData(img, 0, 0)
  return canvas.toDataURL()
}

export interface LiquidOptions {
  /** px of the rim that bends light */
  bezel?: number
  /** how far (px) the backdrop is pulled at the very edge */
  strength?: number
  /** frost on top of the refraction */
  blur?: number
  saturate?: number
  brightness?: number
}

export function useLiquidGlass(target: Ref<HTMLElement | undefined>, opts: LiquidOptions = {}) {
  const { bezel = 18, strength = 46, blur = 3, saturate = 1.8, brightness = 1.05 } = opts
  onMounted(() => {
    const el = target.value
    if (!el || !supportsLiquid()) return
    const id = `liquid-${++seq}`
    const ns = 'http://www.w3.org/2000/svg'
    const filter = document.createElementNS(ns, 'filter')
    filter.setAttribute('id', id)
    filter.setAttribute('x', '0')
    filter.setAttribute('y', '0')
    filter.setAttribute('width', '100%')
    filter.setAttribute('height', '100%')
    filter.setAttribute('color-interpolation-filters', 'sRGB')
    const image = document.createElementNS(ns, 'feImage')
    image.setAttribute('result', 'map')
    image.setAttribute('preserveAspectRatio', 'none')
    const disp = document.createElementNS(ns, 'feDisplacementMap')
    disp.setAttribute('in', 'SourceGraphic')
    disp.setAttribute('in2', 'map')
    disp.setAttribute('scale', String(-strength))
    disp.setAttribute('xChannelSelector', 'R')
    disp.setAttribute('yChannelSelector', 'G')
    filter.append(image, disp)
    svgDefs().appendChild(filter)

    let last = ''
    const draw = () => {
      const w = Math.round(el.offsetWidth)
      const h = Math.round(el.offsetHeight)
      if (!w || !h) return
      const radius = parseFloat(getComputedStyle(el).borderTopLeftRadius) || 0
      const key = `${w}x${h}r${radius}`
      if (key === last) return
      last = key
      image.setAttribute('width', String(w))
      image.setAttribute('height', String(h))
      image.setAttribute('href', displacementMap(w, h, radius, bezel))
      const value = `url(#${id}) blur(${blur}px) saturate(${saturate}) brightness(${brightness})`
      el.style.setProperty('backdrop-filter', value)
      el.style.setProperty('-webkit-backdrop-filter', value)
      el.dataset.liquid = ''
    }
    draw()
    let frame = 0
    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(draw)
    })
    ro.observe(el)
    onBeforeUnmount(() => {
      ro.disconnect()
      filter.remove()
      el.style.removeProperty('backdrop-filter')
      el.style.removeProperty('-webkit-backdrop-filter')
      delete el.dataset.liquid
    })
  })
}
