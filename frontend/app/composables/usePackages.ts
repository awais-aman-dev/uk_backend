import type { PackageDto } from '~~/server/utils/packages'

/** Packages on sale (from the Django backend via /api/packages), shared by pricing, sign-up and the account. */
export async function usePackages() {
  const { data, error } = await useFetch<{ packages: PackageDto[] }>('/api/packages', { key: 'packages' })
  const packages = computed(() => data.value?.packages ?? [])
  const find = (slug: unknown) => packages.value.find((p) => p.slug === slug) ?? null
  const featured = computed(() => packages.value.find((p) => p.featured) ?? packages.value[0] ?? null)
  return { packages, find, featured, error }
}

/** Start paying for a package: Django creates the order, the browser goes to Stripe. */
export async function startCheckout(plan: string) {
  const { url } = await $fetch('/api/checkout', { method: 'POST', body: { plan } })
  window.location.assign(url)
}

export type { PackageDto }
