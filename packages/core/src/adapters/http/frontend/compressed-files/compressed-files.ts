import { stat } from 'node:fs/promises'

/** What gzip makes much smaller: text. Fonts, images and video come compressed already. */
const COMPRESSIBLE = /^(text\/|application\/(javascript|json|xml|manifest\+json)|image\/svg\+xml)/

const accepts = (request: Request) => /\bgzip\b/.test(request.headers.get('accept-encoding') ?? '')

/**
 * A file's answer, gzipped when it is text and the browser takes it, with its headers. A file is compressed once,
 * and again only when it changes.
 */
export function compressedFiles() {
  const known = new Map<string, { modified: number, gzipped: Uint8Array<ArrayBuffer> }>()
  return async (request: Request, file: Bun.BunFile, headers: Record<string, string>): Promise<Response> => {
    if (!COMPRESSIBLE.test(file.type)) return new Response(file, { headers })
    const varied = { ...headers, 'vary': 'accept-encoding' }
    if (!accepts(request)) return new Response(file, { headers: varied })
    const modified = (await stat(file.name!)).mtimeMs
    let entry = known.get(file.name!)
    if (entry?.modified !== modified) {
      entry = { modified, gzipped: Bun.gzipSync(await file.bytes()) }
      known.set(file.name!, entry)
    }
    return new Response(entry.gzipped, { headers: { ...varied, 'content-type': file.type, 'content-encoding': 'gzip' } })
  }
}
