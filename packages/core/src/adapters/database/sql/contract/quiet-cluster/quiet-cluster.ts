import { Cluster } from '../../../../../application/cluster/cluster'

export function quietCluster(): Cluster {
  const listeners = new Map<string, Set<() => void>>()
  return {
    count: async () => 0,
    increment: async () => 1,
    forget: async () => {},
    publish: async channel => listeners.get(channel)?.forEach(listener => listener()),
    subscribe: (channel, listener) => {
      const each = listeners.get(channel) ?? new Set()
      each.add(listener)
      listeners.set(channel, each)
      return () => each.delete(listener)
    },
  }
}
