import { dirname } from 'node:path'
import { join }    from 'node:path'

/** A font Bun's bundler wrote into the CSS as base64: it inlines every small file a `url()` names. */
const INLINED_FONT = /url\(\s*(["']?)data:font\/(woff2|woff|ttf|otf);base64,([A-Za-z0-9+/=]+)\1\s*\)/g

/**
 * Takes the fonts out of a built CSS file into files of their own beside it, named by their content: the CSS is
 * what a page waits for before it paints, and a font is downloaded only when a page uses its weight.
 */
export async function fontsOutOf(css: string): Promise<void> {
  const text = await Bun.file(css).text()
  const fonts = new Map<string, Uint8Array>()
  const replaced = text.replace(INLINED_FONT, (_, _quote: string, extension: string, base64: string) => {
    const bytes = Buffer.from(base64, 'base64')
    const name = `font-${Bun.hash(bytes).toString(36)}.${extension}`
    fonts.set(name, bytes)
    return `url(./${name})`
  })
  if (fonts.size === 0) return
  await Promise.all([...fonts].map(([name, bytes]) => Bun.write(join(dirname(css), name), bytes)))
  await Bun.write(css, replaced)
}
