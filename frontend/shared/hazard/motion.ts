// Kinematics shared by the hazard clip authoring (server/content), the player and the admin editor.

/** Distance travelled (m) by time t (ms) for piecewise-linear speed keyframes [timeMs, m/s]. */
export function distanceAt(speed: [number, number][], tMs: number): number {
  if (!speed.length) return 0
  let z = 0
  let prevT = 0
  let prevV = speed[0]![1]
  for (const [kt, kv] of speed) {
    if (kt <= prevT) {
      prevV = kv
      continue
    }
    const end = Math.min(tMs, kt)
    const vEnd = prevV + (kv - prevV) * ((end - prevT) / (kt - prevT))
    z += ((prevV + vEnd) / 2) * ((end - prevT) / 1000)
    if (tMs <= kt) return z
    prevT = kt
    prevV = kv
  }
  return z + prevV * ((tMs - prevT) / 1000)
}

/** Speed (m/s) at time t (ms). */
export function speedAt(speed: [number, number][], tMs: number): number {
  if (!speed.length) return 0
  if (tMs <= speed[0]![0]) return speed[0]![1]
  for (let i = 1; i < speed.length; i++) {
    const [t1, v1] = speed[i]!
    const [t0, v0] = speed[i - 1]!
    if (tMs <= t1) return v0 + (v1 - v0) * ((tMs - t0) / (t1 - t0 || 1))
  }
  return speed[speed.length - 1]![1]
}

/** Position on [timeMs, x, z] keyframes, linear in between, held at the ends. */
export function positionAt(keys: [number, number, number][], tMs: number): { x: number; z: number; vx: number; vz: number } {
  const first = keys[0]!
  if (keys.length === 1 || tMs <= first[0]) return { x: first[1], z: first[2], vx: 0, vz: 0 }
  for (let i = 1; i < keys.length; i++) {
    const [t1, x1, z1] = keys[i]!
    const [t0, x0, z0] = keys[i - 1]!
    if (tMs <= t1) {
      const k = (tMs - t0) / (t1 - t0 || 1)
      const dt = (t1 - t0) / 1000 || 1
      return { x: x0 + (x1 - x0) * k, z: z0 + (z1 - z0) * k, vx: (x1 - x0) / dt, vz: (z1 - z0) / dt }
    }
  }
  const last = keys[keys.length - 1]!
  return { x: last[1], z: last[2], vx: 0, vz: 0 }
}

/** Keyframes for something travelling along the road with its own speed profile. */
export function travel(x: number, z0: number, speed: [number, number][], durationMs: number, stepMs = 500): [number, number, number][] {
  const keys: [number, number, number][] = []
  for (let t = 0; t <= durationMs; t += stepMs) keys.push([t, x, +(z0 + distanceAt(speed, t)).toFixed(2)])
  return keys
}

/** Scores a hazard click the DVSA way: the window is split into five equal parts worth 5, 4, 3, 2, 1. */
export function scoreClick(window: { startMs: number; endMs: number }, clickMs: number): number {
  if (clickMs < window.startMs || clickMs > window.endMs) return 0
  const part = (window.endMs - window.startMs) / 5
  return Math.max(1, 5 - Math.floor((clickMs - window.startMs) / part))
}

/** Too many clicks, or a burst of rapid clicks, looks like pattern-clicking → the clip scores zero. */
export function isCheating(clicks: number[]): boolean {
  if (clicks.length > 15) return true
  const sorted = [...clicks].sort((a, b) => a - b)
  for (let i = 3; i < sorted.length; i++) if (sorted[i]! - sorted[i - 3]! < 1200) return true // 4 clicks in 1.2 s
  return false
}
