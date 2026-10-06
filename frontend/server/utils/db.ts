import { mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { sql } from 'drizzle-orm'
import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from '../db/schema'
import { seedContentIfNeeded } from '../content'

export type Db = PostgresJsDatabase<typeof schema>

/** Raw `db.execute` returns `{ rows }` on PGlite and a plain array on postgres-js */
export const rowsOf = <T>(res: unknown): T[] => (Array.isArray(res) ? res : (res as { rows: T[] }).rows) as T[]

let dbPromise: Promise<Db> | undefined

/**
 * DATABASE_URL set (Vercel/Neon) → postgres-js. Not set (local dev) → embedded PGlite in .data/pglite.
 * Same Postgres dialect either way; both are migrated and seeded on first use (see initDatabase).
 */
export function useDb(): Promise<Db> {
  dbPromise ??= connect().catch((e) => {
    dbPromise = undefined // don't cache a failed connection
    throw e
  })
  return dbPromise
}

async function connect(): Promise<Db> {
  // Direct (unpooled) connection first: session advisory locks don't survive Neon's transaction-mode pooler.
  // Vercel's Neon integration names variables after the chosen prefix; accept the usual spellings.
  const env = process.env
  const url = env.DATABASE_URL_UNPOOLED ?? env.DATABASE_URL ?? env.POSTGRES_URL_NON_POOLING ?? env.POSTGRES_URL ?? env.STORAGE_URL
  if (url) {
    const client = postgres(url, { max: 1, prepare: false, idle_timeout: 20, connect_timeout: 15 })
    const db = drizzle(client, { schema })
    await initDatabase(db)
    return db
  }

  const [{ PGlite }, { drizzle: drizzlePglite }] = await Promise.all([import('@electric-sql/pglite'), import('drizzle-orm/pglite')])
  const dir = resolve(process.cwd(), env.PGLITE_DIR ?? '.data/pglite')
  mkdirSync(dir, { recursive: true })
  // Both drivers expose the same query-builder API; type everything against one of them.
  const db = drizzlePglite(new PGlite(dir), { schema }) as unknown as Db
  await initDatabase(db)
  return db
}

/** Migrate, then seed content and demo data — under a database-wide lock, so concurrent cold starts don't race. */
async function initDatabase(db: Db) {
  const LOCK = 727_001
  await db.execute(sql`select pg_advisory_lock(${LOCK})`)
  try {
    await runMigrations(db)
    await seedContentIfNeeded(db)
    // No demo learners or staff here: accounts live in the Django backend
  } finally {
    await db.execute(sql`select pg_advisory_unlock(${LOCK})`)
  }
}

export { schema }
