import { defineConfig } from 'drizzle-kit'

// `pnpm db:generate` after changing schema.ts. Migrations are applied by the app itself at start-up
// (server/utils/migrate.ts) — never run drizzle-kit migrate against the database.
export default defineConfig({
  dialect: 'postgresql',
  schema: './server/db/schema.ts',
  out: './server/db/migrations',
  dbCredentials: { url: process.env.DATABASE_URL ?? process.env.POSTGRES_URL ?? process.env.STORAGE_URL ?? '' }
})
