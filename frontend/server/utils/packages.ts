import type { H3Event } from 'h3'
import { poundsToPence } from '#shared/money'

/** A package as Django sells it (managed in Django Admin). */
export interface DjangoPackage {
  id: number
  name: string
  slug: string
  description: string
  duration_days: number
  price: string
  is_featured: boolean
  materials: string[]
  display_order: number
}

/** What the frontend renders on the pricing page and in the account. Money in pence, like the rest of the app. */
export interface PackageDto {
  id: number
  slug: string
  name: string
  description: string
  days: number
  pricePence: number
  featured: boolean
  materials: string[]
}

const toPackageDto = (p: DjangoPackage): PackageDto => ({
  id: p.id,
  slug: p.slug,
  name: p.name,
  description: p.description,
  days: p.duration_days,
  pricePence: poundsToPence(p.price),
  featured: p.is_featured,
  materials: p.materials ?? []
})

/** Packages change rarely (Django Admin), but every landing-page render needs them: keep them a minute */
const CACHE_MS = 60_000
let cache: { at: number; packages: PackageDto[] } | null = null

export async function listPackages(event: H3Event): Promise<PackageDto[]> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.packages
  const res = await djangoFetch<DjangoPackage[]>(event, 'GET', '/api/packages/')
  if (!res.ok) throwDjangoError(res)
  cache = { at: Date.now(), packages: res.data.map(toPackageDto) }
  return cache.packages
}
