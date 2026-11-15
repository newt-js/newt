import { stat }                  from 'node:fs/promises'
import { join }                  from 'node:path'
// --------------------------------------------------------
import { ContentSecurityPolicy } from '../content-security-policy'
import { fileAt }                from '../file-at/file-at'
import { inlineScriptHashes }    from '../inline-script-hashes/inline-script-hashes'
import { policyOf }              from '../policy-of/policy-of'

export function serveFrontend(folder: string, csp?: ContentSecurityPolicy | false, base = '') {
  const index = Bun.file(join(folder, 'index.html'))
  const policies = new Map<string, { modified: number, policy: string }>()
  const headersOf = async (page: Bun.BunFile) => {
    const modified = (await stat(page.name!)).mtimeMs
    const known = policies.get(page.name!)
    const policy = known?.modified === modified ? known.policy : policyOf(csp, inlineScriptHashes(await page.text()))
    policies.set(page.name!, { modified, policy })
    return { 'x-frame-options': 'DENY', 'content-security-policy': policy }
  }

  return async (request: Request): Promise<Response> => {
    if (!(await index.exists())) {
      return new Response('The frontend is not built: its folder has no index.html', { status: 503 })
    }
    const file = await fileAt(folder, new URL(request.url).pathname.slice(base.length) || '/')
    if (!file) {
      return new Response(index, { headers: await headersOf(index) })
    }
    return new Response(file, { headers: file.type.startsWith('text/html') ? await headersOf(file) : {} })
  }
}
