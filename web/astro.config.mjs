// @ts-check
import { defineConfig } from 'astro/config'
import starlight from '@astrojs/starlight'
import react from '@astrojs/react'
import tailwindcss from '@tailwindcss/vite'
import { remarkPackageName } from './src/plugins/remark-package-name.mjs'
import { remarkDiagrams } from './src/plugins/remark-diagrams.mjs'
// The one place the package name lives; the docs write %PKG% for it.
import { PACKAGE } from './src/config/site.ts'

export default defineConfig({
  // Where it is published: GitHub Pages unless SITE_URL says otherwise.
  site: process.env.SITE_URL ?? 'https://newt-js.github.io',
  // The folder it is served from: '/' at a domain's root, '/newt' on GitHub Pages without a domain.
  base: process.env.BASE_PATH ?? '/',
  markdown: {
    remarkPlugins: [remarkPackageName(PACKAGE), remarkDiagrams],
  },
  integrations: [
    starlight({
      title: 'newt',
      favicon: '/favicon.svg',
      // Code in gruvbox, the same themes as the landing's blocks (Blocks.astro).
      // Long lines wrap (keeping their indent) instead of scrolling; the code itself is kept under 76 columns.
      expressiveCode: {
        themes: ['gruvbox-dark-medium', 'gruvbox-light-medium'],
        defaultProps: { wrap: true, preserveIndent: true },
        // The landing's code window (Blocks.astro): gruvbox tokens on the site's card, 13px, a muted bar.
        styleOverrides: {
          codeBackground: 'var(--card)',
          codeFontSize: '0.8125rem',
          codeLineHeight: '1.7',
          borderColor: 'var(--border)',
          borderRadius: 'calc(var(--radius) + 2px)',
          frames: {
            // No tab: the file name sits in a plain bar, like the landing's code window.
            editorTabBarBackground: 'color-mix(in srgb, var(--muted) 50%, var(--card))',
            editorActiveTabBackground: 'transparent',
            editorActiveTabForeground: 'var(--muted-foreground)',
            editorActiveTabBorderColor: 'transparent',
            editorTabBorderRadius: '0',
            editorTabsMarginInlineStart: '0',
            editorTabsMarginBlockStart: '0',
            editorActiveTabIndicatorTopColor: 'transparent',
            editorActiveTabIndicatorBottomColor: 'transparent',
            editorTabBarBorderBottomColor: 'var(--border)',
            terminalTitlebarBackground: 'color-mix(in srgb, var(--muted) 50%, var(--card))',
            terminalBackground: 'var(--card)',
            terminalTitlebarBorderBottomColor: 'var(--border)',
            frameBoxShadowCssValue: 'none',
          },
        },
      },
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
            { slug: 'guides/app' },
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
