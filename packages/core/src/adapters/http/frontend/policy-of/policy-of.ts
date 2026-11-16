import { CONTENT_SECURITY_POLICY }    from '../content-security-policy'
import type { ContentSecurityPolicy } from '../content-security-policy'

const NEVER_FRAMED = "frame-ancestors 'none'"

export function policyOf(own: ContentSecurityPolicy | false | undefined, inlineScripts: string[]): string {
  if (own === false) {
    return NEVER_FRAMED
  }
  const directives: Record<string, readonly string[] | null> = { ...CONTENT_SECURITY_POLICY, ...own }
  if (directives['script-src'] && inlineScripts.length > 0) {
    directives['script-src'] = [...directives['script-src'], ...inlineScripts]
  }
  return Object.entries(directives)
    .filter((entry): entry is [string, readonly string[]] => entry[1] !== null)
    .map(([name, sources]) => [name, ...sources].join(' '))
    .join('; ')
}
