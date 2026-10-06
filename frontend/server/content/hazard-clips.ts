import type { HazardScene, HazardWindow, SceneActor, SceneProp } from '../../shared/types/learn'
import { travel } from '../../shared/hazard/motion'

// Hazard perception clips, authored as data. The player renders them with the 2.5D SVG engine;
// the admin edits the same JSON. World units: metres. x: 0 = centre line, negative = left (we drive on the left).

interface ClipSeed {
  slug: string
  title: string
  description: string
  scene: HazardScene
  hazards: HazardWindow[]
}

const HOUSE_COLOURS = ['#c9a27e', '#b9b2a6', '#d8cbb3', '#a8543f', '#e6dccb', '#9b8d7c', '#c4b8a2']
const pick = <T>(arr: T[], i: number) => arr[i % arr.length]!

/** A row of houses with front gardens, trees and the odd lamp post along one side of the road. */
function street(side: -1 | 1, from: number, to: number, opts: { x?: number; gap?: [number, number][]; shops?: boolean; seed?: number } = {}): SceneProp[] {
  const props: SceneProp[] = []
  const x = side * (opts.x ?? 9)
  let i = opts.seed ?? 0
  for (let z = from; z < to; z += 12) {
    if (opts.gap?.some(([a, b]) => z + 10 > a && z < b)) continue
    props.push({ kind: opts.shops ? 'shop' : 'house', x, z, len: 10.5, h: opts.shops ? 7 : 6 + (i % 3), color: pick(HOUSE_COLOURS, i * 3 + (side > 0 ? 1 : 0)) })
    if (i % 2 === 0) props.push({ kind: 'tree', x: side * 6.6, z: z + 5, h: 6 + (i % 3) })
    if (i % 4 === 1) props.push({ kind: 'lamp', x: side * 4.3, z: z + 2 })
    i++
  }
  return props
}

function hedges(from: number, to: number, halfWidth: number, gaps: { side: -1 | 1; z: number; w: number }[] = []): SceneProp[] {
  const props: SceneProp[] = []
  for (const side of [-1, 1] as const) {
    let z = from
    const sideGaps = gaps.filter((g) => g.side === side).sort((a, b) => a.z - b.z)
    for (const g of sideGaps) {
      if (g.z > z) props.push({ kind: 'hedge', x: side * (halfWidth + 1.2), z, len: g.z - z, h: 2.2 })
      z = g.z + g.w
    }
    props.push({ kind: 'hedge', x: side * (halfWidth + 1.2), z, len: to - z, h: 2.2 })
  }
  for (let z = from + 30; z < to; z += 47) props.push({ kind: 'tree', x: (z % 2 ? -1 : 1) * (halfWidth + 5), z, h: 9 })
  return props
}

/* ---------- 1. School run ---------- */
const schoolRun: ClipSeed = {
  slug: 'school-run',
  title: 'School run',
  description: 'A residential street outside a primary school at home time.',
  scene: {
    durationMs: 22000,
    speed: [[0, 12], [10500, 12], [13000, 4], [14500, 0], [17800, 0], [20800, 8]],
    lighting: 'day',
    road: { halfWidth: 3.6, markings: 'centre', pavement: true },
    props: [
      ...street(-1, 10, 400, { gap: [[136, 196]] }),
      ...street(1, 4, 400, { seed: 2 }),
      { kind: 'school', x: -10, z: 138, len: 54, h: 8, color: '#b85c3c' },
      { kind: 'fence', x: -6.3, z: 136, len: 60, h: 1.4 },
      { kind: 'sign', x: -4.6, z: 104, sign: 'children' },
      { kind: 'sign', x: 4.6, z: 70, sign: 'speed-20' },
      { kind: 'parkedCar', x: 2.6, z: 128, color: '#5f6b7a', view: 'front' },
      { kind: 'parkedCar', x: 2.6, z: 141, color: '#e2e2e2', view: 'front' },
      { kind: 'parkedCar', x: 2.6, z: 150, color: '#8a1f2b', view: 'front' },
      { kind: 'parkedCar', x: 2.6, z: 166, color: '#2c4a72', view: 'front' },
      { kind: 'parkedCar', x: 2.6, z: 175, color: '#1d1d1f', view: 'front' }
    ],
    actors: [
      { id: 'oncoming', kind: 'car', color: '#c7c9cc', keys: [[0, 1.8, 150], [8000, 1.8, 20]] },
      { id: 'walker', kind: 'pedestrian', color: '#6b4f9e', keys: [[0, -5, 58], [22000, -5, 84]] },
      { id: 'parent', kind: 'pedestrian', color: '#2f6f5e', keys: [[0, -5.3, 132], [22000, -5.3, 118]] },
      { id: 'ball', kind: 'ball', color: '#ff3b30', keys: [[10300, 3.4, 158], [11400, 0.6, 158], [12600, -4.4, 158.5]] },
      { id: 'child', kind: 'child', color: '#ffcc00', keys: [[11500, 4.8, 158], [12400, 2.6, 158], [13200, 1.2, 158], [15800, -4.9, 158.5], [22000, -5.2, 160]] }
    ]
  },
  hazards: [{ id: 'ball-child', label: 'Ball rolls out — a child runs after it', startMs: 10300, endMs: 14300, actor: 'child' }]
}

/* ---------- 2. Zebra crossing at dusk ---------- */
const zebra: ClipSeed = {
  slug: 'zebra-crossing',
  title: 'High street at dusk',
  description: 'Shops, a bus stop and a zebra crossing as the light fades.',
  scene: {
    durationMs: 23000,
    speed: [[0, 11], [12800, 11], [15800, 0], [19000, 0], [22000, 8]],
    lighting: 'dusk',
    road: { halfWidth: 3.6, markings: 'centre', pavement: true },
    zebra: [{ z: 170 }],
    props: [
      ...street(-1, 6, 400, { shops: true, seed: 1, x: 7.5 }),
      ...street(1, 0, 400, { shops: true, seed: 4, x: 7.5 }),
      { kind: 'beacon', x: -4.3, z: 168.5 },
      { kind: 'beacon', x: 4.3, z: 168.5 },
      { kind: 'beacon', x: -4.3, z: 174.5 },
      { kind: 'beacon', x: 4.3, z: 174.5 },
      { kind: 'busStop', x: 5, z: 120 },
      { kind: 'parkedCar', x: -2.7, z: 60, color: '#3a3a3c', view: 'rear' }
    ],
    actors: [
      { id: 'bus', kind: 'bus', color: '#d62d20', keys: [[0, 1.8, 260], [9000, 1.8, 140], [12000, 2.4, 121], [23000, 2.4, 121]] },
      { id: 'shopper-1', kind: 'pedestrian', color: '#8e8e93', keys: [[0, 5.4, 90], [23000, 5.4, 120]] },
      { id: 'shopper-2', kind: 'pedestrian', color: '#5e5ce6', keys: [[0, 5.2, 210], [23000, 5.2, 180]] },
      { id: 'walker', kind: 'pedestrian', color: '#ff9f0a', keys: [[0, -5.2, 140], [11000, -5.2, 168.5], [12300, -4.3, 171.8], [18500, 4.8, 171.8], [23000, 5.4, 180]] }
    ]
  },
  hazards: [{ id: 'zebra', label: 'Pedestrian steps onto the zebra crossing', startMs: 10600, endMs: 14600, actor: 'walker' }]
}

/* ---------- 3. Car door & cyclist ---------- */
const cyclist = travel(-2.1, 25, [[0, 6.5]], 12000).concat([
  [13500, -0.7, 112.75],
  [15500, -0.7, 125.75],
  [17000, -2.1, 135.5],
  [22000, -2.1, 168]
])
const carDoor: ClipSeed = {
  slug: 'car-door',
  title: 'Parked cars and a cyclist',
  description: 'Following a cyclist past a long line of parked cars.',
  scene: {
    durationMs: 21000,
    speed: [[0, 7], [11800, 7], [13800, 3], [16800, 3], [19000, 7]],
    lighting: 'day',
    cameraX: -1.1,
    road: { halfWidth: 4.4, markings: 'centre', pavement: true },
    props: [
      ...street(-1, 8, 400, { x: 9.8, seed: 3 }),
      ...street(1, 0, 400, { x: 9.8, seed: 5 }),
      ...[40, 50, 61, 71, 81, 92, 102, 122, 133, 143, 153].map((z, i): SceneProp => ({
        kind: 'parkedCar',
        x: -3.5,
        z,
        view: 'rear',
        color: pick(['#3a3a3c', '#d1d1d6', '#1c4e80', '#8e8e93', '#a2342b', '#f2f2f7', '#2d6a4f'], i)
      }))
    ],
    actors: [
      { id: 'cyclist', kind: 'cyclist', color: '#ff9f0a', keys: cyclist },
      { id: 'door', kind: 'car', color: '#1c4e80', view: 'rear', doorAt: 11500, keys: [[0, -3.5, 112.6]] },
      { id: 'oncoming', kind: 'van', color: '#f2f2f7', keys: [[0, 2.2, 190], [21000, 2.2, -10]] }
    ]
  },
  hazards: [{ id: 'door-cyclist', label: 'A door opens and the cyclist swerves out', startMs: 11500, endMs: 14800, actor: 'cyclist' }]
}

/* ---------- 4. Emerging car ---------- */
const emerging: ClipSeed = {
  slug: 'emerging-car',
  title: 'Side road on the left',
  description: 'A suburban road with a junction hidden behind hedges.',
  scene: {
    durationMs: 20000,
    speed: [[0, 13], [11300, 13], [13800, 6], [20000, 8]],
    lighting: 'day',
    road: { halfWidth: 3.8, markings: 'centre', pavement: true },
    sideRoads: [{ z: 189, side: 'left', width: 8 }],
    props: [
      ...street(-1, 10, 400, { gap: [[172, 204]], seed: 6 }),
      ...street(1, 0, 400, { seed: 1 }),
      { kind: 'hedge', x: -6.6, z: 150, len: 37, h: 2.3 },
      { kind: 'tree', x: -7.5, z: 184, h: 9 },
      { kind: 'sign', x: -4.8, z: 150, sign: 'crossroads' }
    ],
    actors: [
      { id: 'emerging', kind: 'car', color: '#ff3b30', keys: [[0, -70, 193], [8000, -40, 193], [11300, -9, 193], [12600, -3.6, 195.6], [13600, -1.8, 201], [20000, -1.8, 252]] },
      { id: 'oncoming', kind: 'car', color: '#1d1d1f', keys: [[0, 1.9, 230], [11000, 1.9, 10]] },
      { id: 'jogger', kind: 'pedestrian', color: '#30d158', keys: [[0, 5.1, 40], [20000, 5.1, 100]] }
    ]
  },
  hazards: [{ id: 'emerging', label: 'Car pulls out of the side road', startMs: 9400, endMs: 12900, actor: 'emerging' }]
}

/* ---------- 5. Country lane: tractor, then a horse rider (two hazards) ---------- */
const countryLane: ClipSeed = {
  slug: 'country-lane',
  title: 'Country lane',
  description: 'A narrow rural road between hedgerows. This clip has two hazards.',
  scene: {
    durationMs: 26000,
    speed: [[0, 14], [7800, 14], [10800, 5], [17000, 5], [19500, 12], [21500, 12], [23500, 4], [26000, 4]],
    lighting: 'day',
    cameraX: -1.4,
    road: { halfWidth: 3, markings: 'none', pavement: false, verge: 'grass' },
    sideRoads: [
      { z: 150, side: 'left', width: 6 },
      { z: 205, side: 'right', width: 6 }
    ],
    props: [
      ...hedges(0, 420, 3, [
        { side: -1, z: 150, w: 6 },
        { side: 1, z: 205, w: 6 }
      ]),
      { kind: 'sign', x: -4.2, z: 60, sign: 'national-speed-limit' }
    ],
    actors: [
      { id: 'tractor', kind: 'tractor', color: '#c62828', keys: [[0, -16, 153], [6800, -16, 153], [8800, -6, 154], [10500, -1.4, 158.5], [16000, -1.4, 186], [18200, -0.4, 199], [19600, 2.5, 207.5], [21500, 12, 208], [23000, 22, 208]] },
      { id: 'horse', kind: 'horse', color: '#7a4b2a', keys: [[0, -1.9, 236], [26000, -1.9, 276]] },
      { id: 'oncoming', kind: 'car', color: '#c7c9cc', keys: [[0, 1.5, 120], [6000, 1.5, 40]] }
    ]
  },
  hazards: [
    { id: 'tractor', label: 'Tractor pulls out of a field gateway', startMs: 6900, endMs: 10400, actor: 'tractor' },
    { id: 'horse', label: 'Horse rider ahead on the narrow lane', startMs: 19800, endMs: 23400, actor: 'horse' }
  ]
}

/* ---------- 6. Motorway at night ---------- */
const MOTORWAY_DURATION = 22000
const brakingCar = (id: string, x: number, z0: number, v: number, brakeAt: number, vAfter: number, color: string): SceneActor => ({
  id,
  kind: 'car',
  color,
  view: 'rear',
  brakeAt,
  keys: travel(x, z0, [[0, v], [brakeAt, v], [brakeAt + 2500, vAfter]], MOTORWAY_DURATION)
})
const motorwayNight: ClipSeed = {
  slug: 'motorway-night',
  title: 'Motorway at night',
  description: 'Three lanes in the dark. Watch the tail lights far ahead.',
  scene: {
    durationMs: MOTORWAY_DURATION,
    speed: [[0, 29], [10200, 29], [13500, 13], [22000, 13]],
    lighting: 'night',
    cameraX: 0,
    road: { halfWidth: 5.4, markings: 'motorway', pavement: false },
    props: [],
    actors: [
      brakingCar('car-a', 0, 62, 29, 9500, 12, '#8e8e93'),
      brakingCar('car-b', -3.6, 100, 26, 9200, 10, '#3a3a3c'),
      brakingCar('car-c', 3.6, 150, 28, 9000, 11, '#d1d1d6'),
      { id: 'lorry', kind: 'van', color: '#e5e5ea', view: 'rear', brakeAt: 9100, keys: travel(-3.6, 220, [[0, 24], [9100, 24], [11600, 9]], MOTORWAY_DURATION) },
      { id: 'overtaker', kind: 'car', color: '#1c4e80', view: 'rear', keys: travel(3.6, -12, [[0, 34], [9600, 34], [12500, 14]], MOTORWAY_DURATION) }
    ]
  },
  hazards: [{ id: 'queue', label: 'Traffic ahead brakes sharply', startMs: 9200, endMs: 12600, actor: 'car-a' }]
}

export const HAZARD_CLIPS: ClipSeed[] = [schoolRun, zebra, carDoor, emerging, countryLane, motorwayNight]
