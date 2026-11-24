import type { ContextToRun } from '../run-contexts-options'

/**
 * Each context's host, the context it is of, and `*.<host>` for one that answers at its subdomains too. Two contexts
 * at one host stop it before anything starts.
 */
export function hostsOf(contexts: ContextToRun[]): Record<string, string> {
  const hosts: Record<string, string> = {}
  for (const { context, host, subdomains } of contexts) {
    if (!host) continue
    const given = host.toLowerCase()
    for (const each of subdomains ? [given, `*.${given}`] : [given]) {
      const taken = hosts[each]
      if (taken) throw new Error(`${taken} and ${context.name} both answer at the host ${each}`)
      hosts[each] = context.name
    }
  }
  return hosts
}
