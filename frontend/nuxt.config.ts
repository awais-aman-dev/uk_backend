// https://nuxt.com/docs/api/configuration/nuxt-config
import { fileURLToPath } from 'node:url'

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: false },
  css: ['~/assets/css/main.css'],
  runtimeConfig: {
    // The Django backend (accounts, packages, payments, cabinet). Set NUXT_DJANGO_API_URL per environment.
    djangoApiUrl: 'http://localhost:8000'
  },
  nitro: {
    // Migration SQL ships inside the server bundle and is applied at start-up (server/utils/migrate.ts)
    serverAssets: [{ baseName: 'migrations', dir: fileURLToPath(new URL('./server/db/migrations', import.meta.url)) }],
    vercel: {
      // Run next to the Neon database (London); the first request after a deploy migrates and seeds
      functions: { regions: ['lhr1'], maxDuration: 60 }
    }
  },
  app: {
    head: {
      htmlAttrs: { lang: 'en-GB' },
      title: '1Theory — the easy way to pass your theory test',
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
        {
          name: 'description',
          content: 'Video lessons, custom-built hazard perception and practice questions that actually teach. Pass your UK theory test first time.'
        },
        { name: 'theme-color', content: '#000000' }
      ],
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Inter:opsz,wght@14..32,400..700&display=swap'
        }
      ],
      // Lets CSS hide reveal-on-scroll content only when JS is available to show it again
      script: [{ innerHTML: "document.documentElement.classList.add('js')", tagPosition: 'head' }]
    }
  }
})
