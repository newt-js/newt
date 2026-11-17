// @ts-check
import { defineConfig } from 'astro/config'
import starlight from '@astrojs/starlight'
import react from '@astrojs/react'
import tailwindcss from '@tailwindcss/vite'
import { remarkPackageName } from './src/plugins/remark-package-name.mjs'
// The one place the package name lives; the docs write %PKG% for it.
import { PACKAGE } from './src/config/site.ts'

export default defineConfig({
  // Where it is published: GitHub Pages unless SITE_URL says otherwise.
  site: process.env.SITE_URL ?? 'https://newt-js.github.io',
  // The folder it is served from: '/' at a domain's root, '/newt' on GitHub Pages without a domain.
  base: process.env.BASE_PATH ?? '/',
  markdown: {
    remarkPlugins: [remarkPackageName(PACKAGE)],
  },
  integrations: [
    starlight({
      title: 'newt',
      favicon: '/favicon.svg',
      defaultLocale: 'root',
      locales: {
        root: { label: 'English', lang: 'en' },
        es: { label: 'Español', lang: 'es' },
      },
      customCss: ['./src/styles/docs.css'],
      components: {
        Header: './src/components/docs/Header.astro',
        PageTitle: './src/components/docs/PageTitle.astro',
        MobileMenuFooter: './src/components/docs/MobileMenuFooter.astro',
      },
      editLink: undefined,
      lastUpdated: false,
      // Versions: off until there is an old one to keep. When 0.2 ships, archive 0.1:
      //   plugins: [starlightVersions({ current: { label: '0.2' }, versions: [{ slug: '0.1' }] })]
      //   + `versions: defineCollection({ loader: docsVersionsLoader() })` in content.config.ts
      //   + <VersionMenu><VersionSelect /></VersionMenu> on top of the sidebar, <VersionNotice /> under the title.
      sidebar: [
        { label: 'Get started', translations: { es: 'Empezar' }, items: [{ autogenerate: { directory: 'start' } }] },
        { label: 'Tutorial', translations: { es: 'Tutorial' }, items: [{ autogenerate: { directory: 'tutorial' } }] },
        { label: 'Concepts', translations: { es: 'Conceptos' }, items: [{ autogenerate: { directory: 'concepts' } }] },
        {
          label: 'Guides',
          translations: { es: 'Guías' },
          items: [
            { slug: 'guides/authentication' },
            { slug: 'guides/testing' },
            { label: 'Databases', translations: { es: 'Bases de datos' }, items: [{ autogenerate: { directory: 'guides/databases' } }] },
            { slug: 'guides/frontend' },
            { slug: 'guides/monorepo' },
            { slug: 'guides/deploy' },
            { slug: 'guides/scaling' },
          ],
        },
        {
          label: 'Reference',
          translations: { es: 'Referencia' },
          items: [
            { label: 'CLI', translations: { es: 'CLI' }, collapsed: true, items: [{ autogenerate: { directory: 'reference/cli' } }] },
            { slug: 'reference/core' },
            { slug: 'reference/http' },
            { slug: 'reference/testing' },
            { slug: 'reference/lint' },
            { slug: 'reference/configuration' },
          ],
        },
      ],
    }),
    react(),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
})
