// Content model of the learning platform. Shared by the DB (jsonb columns), API, app and the admin editors.

/* ---------- Lessons & e-book: block content ---------- */

export type Block =
  | { type: 'text'; text: string } // paragraphs separated by blank lines; **bold** supported
  | { type: 'heading'; text: string }
  | { type: 'keypoints'; title?: string; items: string[] }
  | { type: 'callout'; tone: 'tip' | 'warning' | 'rule'; title?: string; text: string }
  | { type: 'figure'; figure: FigureKey; caption?: string }
  | { type: 'signs'; codes: string[]; caption?: string }
  | { type: 'scene'; clip: string; caption?: string } // loops a hazard clip as an illustration
  | { type: 'check'; questions: string[]; title?: string } // question keys
  | { type: 'html'; html: string; title?: string } // theory written in the Django admin (sanitised on our server)
  // Django lesson blocks (Learning API guide §5.2): media are short-lived signed https URLs
  | { type: 'video'; url: string; title?: string }
  | { type: 'document'; url: string; title?: string }
  | { type: 'hazard'; clips: string[]; title?: string } // clip slugs, looked up in the response's `clips`

export type FigureKey = 'stopping-distances' | 'sign-shapes' | 'two-second-rule' | 'mirror-signal'

/* ---------- Questions ---------- */

export type QuestionType = 'single' | 'multi' | 'image'

export interface QuestionOption {
  id: string
  text?: string
  sign?: string // sign code, for image answers
}

export interface QuestionMedia {
  kind: 'sign'
  code: string
}

/** What the browser gets before answering — never includes the answer. */
export interface QuestionDto {
  id: number
  key: string
  topic: string
  type: QuestionType
  prompt: string
  media: QuestionMedia | null
  options: QuestionOption[]
  pick: number // how many answers to mark
}

export interface AnswerResult {
  correct: boolean
  correctIds: string[]
  explanation: string
  lesson: { slug: string; title: string } | null
}

/* ---------- Road signs ---------- */

export type SignCategory = 'warning' | 'regulatory' | 'information' | 'motorway'

export interface SignSpec {
  shape: 'triangle' | 'circle' | 'octagon' | 'inverted-triangle' | 'rect' | 'square'
  fill: string
  border?: string
  symbol: string // key into the sign symbol library
  text?: string
  slash?: boolean // red diagonal (prohibition)
}

export interface SignDto {
  code: string
  name: string
  category: SignCategory
  meaning: string
  spec: SignSpec
}

/* ---------- Hazard perception scenes ---------- */

export type Lighting = 'day' | 'dusk' | 'night'

/** World units are metres. x = lateral (0 = road centre, + right), z = forward distance, y = up. */
export interface HazardScene {
  durationMs: number
  /** Camera speed keyframes [timeMs, metres per second]; linear in between */
  speed: [number, number][]
  lighting: Lighting
  rain?: boolean
  /** Lateral position of the camera (driver). UK: we drive on the left, so negative. Default -1.8 */
  cameraX?: number
  road: {
    halfWidth: number
    markings: 'centre' | 'none' | 'motorway'
    pavement: boolean
    verge?: 'grass' | 'hedge'
  }
  sideRoads?: { z: number; side: 'left' | 'right'; width: number }[]
  zebra?: { z: number }[]
  props: SceneProp[]
  actors: SceneActor[]
}

export type PropKind = 'house' | 'shop' | 'school' | 'tree' | 'lamp' | 'parkedCar' | 'busStop' | 'hedge' | 'sign' | 'fence' | 'beacon'

export interface SceneProp {
  kind: PropKind
  x: number
  z: number
  /** length along the road (houses, hedges) */
  len?: number
  h?: number
  color?: string
  sign?: string // sign code for kind = 'sign'
  view?: 'rear' | 'front' // parked cars
}

export type ActorKind = 'pedestrian' | 'child' | 'cyclist' | 'car' | 'van' | 'bus' | 'tractor' | 'ball' | 'horse'

export interface SceneActor {
  id: string
  kind: ActorKind
  color?: string
  /** Omit to pick automatically from the direction of travel */
  view?: 'rear' | 'front' | 'side'
  /** [timeMs, x, z] — world position keyframes; held before the first / after the last */
  keys: [number, number, number][]
  /** optional extras, e.g. car door opening at a time */
  doorAt?: number
  brakeAt?: number
}

export interface HazardWindow {
  id: string
  label: string
  startMs: number
  endMs: number
  actor?: string // actor id to highlight in the review
}

/** Clip for playing — hazard windows are withheld until the attempt is scored. */
export interface HazardClipDto {
  id: number
  slug: string
  title: string
  description: string
  durationMs: number
  hazardCount: number
  scene: HazardScene
}

/**
 * A filmed clip from the Django backend: a real video, scored there. Hazard timings are withheld until
 * the attempt is scored, like ours; the length may be unknown until the video's metadata loads.
 */
export interface HazardVideoClipDto {
  kind: 'video'
  slug: string
  title: string
  description: string
  durationMs: number | null
  hazardCount: number
  maxClicks: number
  /** Short-lived signed URL — fetched fresh for every play */
  url: string
}

export type AnyHazardClip = HazardClipDto | HazardVideoClipDto
export const isVideoClip = (c: AnyHazardClip): c is HazardVideoClipDto => 'kind' in c && c.kind === 'video'

/** GET /api/learn/progress/ (Learning API guide §12) — `null` means "never happened", not 0. */
export interface DjangoProgress {
  streak: number
  studyDays: number
  lastStudiedOn: string | null
  questionsAnswered: number
  questionsLearnt: number
  mastery: number
  lessonsCompleted: number
  mockAttempts: number
  mocksPassed: number
  bestMockScore: number | null
  hazardAttempts: number
  bestHazardScore: number | null
}

/** GET /api/learn/topics/ (guide §5.1) */
export interface DjangoTopic {
  slug: string
  title: string
  description: string
  icon: string
  mastery: number
  questions: number
  lessons: { slug: string; title: string; summary: string; minutes: number; done: boolean }[]
}

/** GET /api/learn/exams/ (guide §13) — `timeLimitSeconds: null` means untimed */
export interface DjangoExam {
  slug: string
  title: string
  description: string
  kind: 'mock' | 'practice'
  questionCount: number
  passMark: number
  timeLimitSeconds: number | null
}

/** POST /api/learn/exams/{slug}/submit/ (guide §14) */
export interface DjangoExamResult {
  score: number
  total: number
  passMark: number
  passed: boolean
  questions: { id: number; key: string; correct: boolean; selected: string[]; correctIds: string[]; explanation: string }[]
}

/** The learning dashboard in Django mode: exactly the guide's Flow A (topics + progress). */
export interface DjangoDashboard {
  source: 'django'
  hasAccess: boolean
  topics: DjangoTopic[]
  progress: DjangoProgress | null
}

export interface HazardResult {
  score: number
  maxScore: number
  flagged: boolean // too many / rhythmic clicks → 0
  windows: (HazardWindow & { score: number; clickMs: number | null })[]
  clicks: number[]
}
