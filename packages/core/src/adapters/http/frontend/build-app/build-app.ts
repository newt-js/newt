import { cp }         from 'node:fs/promises'
import { mkdtemp }    from 'node:fs/promises'
import { tmpdir }     from 'node:os'
import { join }       from 'node:path'
// --------------------------------------------------------
import { fontsOutOf } from '../fonts-out-of/fonts-out-of'

/** The bundler plugins bunfig.toml gives Bun.serve, `[serve.static] plugins`, as Bun loads them. */
async function staticPlugins(): Promise<Bun.BunPlugin[]> {
  const bunfig = Bun.file(join(process.cwd(), 'bunfig.toml'))
  if (!await bunfig.exists()) return []
  const config = Bun.TOML.parse(await bunfig.text()) as { serve?: { static?: { plugins?: string[] } } }
  const names = config.serve?.static?.plugins ?? []
  return Promise.all(names.map(async name => {
    const loaded = await import(Bun.resolveSync(name, process.cwd())) as { default: Bun.BunPlugin }
    return loaded.default
  }))
}

/**
 * An app of an HTML import, built for production into a folder of its own: one chunk per lazy import, so a page
 * downloads only what it opens; React as it runs in production; its fonts in files of their own; its public folder
 * beside it. Served from there, it gets what a built app gets: its CSP, and never in a frame.
 */
export async function buildApp(app: Bun.HTMLBundle, prefix: string, publicFolder?: string): Promise<string> {
  const folder = await mkdtemp(join(tmpdir(), 'newt-app-'))
  const plugins = await staticPlugins()
  const built = await Bun.build({
    entrypoints: [app.index],
    outdir: folder,
    target: 'browser',
    splitting: true,
    minify: true,
    publicPath: `${prefix}/`,
    define: { 'process.env.NODE_ENV': '"production"' },
    plugins,
    throw: false,
  })
  if (!built.success) throw new AggregateError(built.logs, `The app at ${prefix || '/'} did not build: ${built.logs.join('; ')}`)
  for (const output of built.outputs.filter(each => each.path.endsWith('.css'))) {
    await fontsOutOf(output.path)
  }
  if (publicFolder) await cp(publicFolder, folder, { recursive: true })
  return folder
}
