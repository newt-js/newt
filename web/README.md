# @newt-js/web

newt's site: the landing, the principles, the guide and the tutorial, in English (`/`) and Spanish (`/es/`).
Astro 7 with Starlight for the guide, Tailwind 4 and shadcn/ui, in gruvbox's colours.

```sh
bun install                  # at the repository's root: web/ is one of its workspaces
bun run --cwd web dev        # http://localhost:4321
bun run --cwd web build      # web/dist/
```

Astro runs on Node: 22.23.4 or later (`.nvmrc`), older ones are refused.

## Deploying

`.github/workflows/web.yml` builds it and publishes it on GitHub Pages on every push to `main` that touches
`web/`. The repository's Pages must take their source from GitHub Actions (Settings → Pages).

`SITE_URL` is the address it is published at, for its canonical URLs and sitemap, and `BASE_PATH` the folder
it is served from: `https://newt-js.github.io` and `/newt` while it has no domain of its own. With a domain
pointing at Pages, set `SITE_URL` to it and `BASE_PATH` to `/`.

## Names

`src/config/site.ts` holds them:

- `PACKAGE`: the npm scope, `@newt-js` (`@newt-js/core`, `@newt-js/lint`, `@newt-js/plan`, `@newt-js/review`,
  `@newt-js/monitor`). The landing reads it, and the docs write `%PKG%` wherever it goes (in text and in code);
  a remark plugin puts it in at build time.
- `GITHUB`: the repository, linked from the headers.

## Where things are

| Path | What it is |
|---|---|
| `src/pages/` | The landing and the principles, one file per language |
| `src/components/landing/` | The landing's sections |
| `src/i18n/` | The landing's and the principles' copy, `en` and `es` (the principles' in `manifesto.ts`) |
| `src/content/docs/` | The guide, the tutorial and the reference (Starlight); Spanish under `es/` |
| `src/components/ui/` | shadcn/ui components |
| `src/styles/theme.css` | The theme's tokens (gruvbox), shared by the landing and the docs |
| `src/styles/docs.css` | Starlight's colours mapped to those tokens |
| `wireframe/` | The wireframe the site was built from (not published) |
