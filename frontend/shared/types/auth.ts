export type Role = 'learner' | 'manager' | 'admin'

/** What the browser is allowed to know about the signed-in user. */
export interface SessionUser {
  id: number
  name: string
  email: string
  role: Role
}

/** Body of a 4xx error from our API (inside h3's `data`). */
export interface ApiErrorData {
  fieldErrors?: Record<string, string>
}
