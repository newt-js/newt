import { stat }                       from 'node:fs/promises'
import { join }                       from 'node:path'
// --------------------------------------------------------
import { compressedFiles }            from '../compressed-files/compressed-files'
import type { ContentSecurityPolicy } from '../content-security-policy'
import { fileAt }                     from '../file-at/file-at'
import { inlineScriptHashes }         from '../inline-script-hashes/inline-script-hashes'
import { policyOf }                   from '../policy-of/policy-of'

/** A page is asked again every time: it names the files of its build. */
const PAGE_CACHE = 'no-cache'

/** A file named by its content never changes: a browser keeps it. */
const FOREVER = 'public, max-age=31536000, immutable'

/**
 * Serves a built frontend's folder: a file that exists, and its page for any other address, under its CSP and
 * never in a frame; text gzipped. `immutable` names the files named by their content, which a browser keeps.
 */
export function serveFrontend(folder: string, csp?: ContentSecurityPolicy | false, base = '', immutable?: RegExp) {
  const index = Bun.file(join(folder, 'index.html'))
  const policies = new Map<string, { modified: number, policy: string }>()
  const headersOf = async (page: Bun.BunFile) => {
    const modified = (await stat(page.name!)).mtimeMs
    const known = policies.get(page.name!)
    const policy = known?.modified === modified ? known.policy : policyOf(csp, inlineScriptHashes(await page.text()))
    policies.set(page.name!, { modified, policy })
    return { 'x-frame-options': 'DENY', 'content-security-policy': policy, 'cache-control': PAGE_CACHE }
  }

  const answer = compressedFiles()
  const cacheOf = (file: Bun.BunFile): Record<string, string> => immutable?.test(file.name!.split('/').at(-1)!) ? { 'cache-control': FOREVER } : {}

  return async (request: Request): Promise<Response> => {
    if (!(await index.exists())) {
      return new Response('The frontend is not built: its folder has no index.html', { status: 503 })
    }
    const file = await fileAt(folder, new URL(request.url).pathname.slice(base.length) || '/')
    if (!file) {
      return answer(request, index, await headersOf(index))
    }
    return answer(request, file, file.type.startsWith('text/html') ? await headersOf(file) : cacheOf(file))
  }
}
