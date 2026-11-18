import type { ContextToRun } from '../run-contexts-options'

/** Each context's host, the context it is of; two contexts at one host stop it before anything starts. */
export function hostsOf(contexts: ContextToRun[]): Record<string, string> {
  const hosts: Record<string, string> = {}
  for (const { context, host } of contexts) {
    if (!host) continue
    const given = host.toLowerCase()
    const taken = hosts[given]
    if (taken) throw new Error(`${taken} and ${context.name} both answer at the host ${given}`)
    hosts[given] = context.name
  }
  return hosts
}
