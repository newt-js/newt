/** How the backend gets its cluster: no `expression` for the platform's own, in memory. */
export type ClusterTemplate = { importLines: string[], expression?: string | undefined, env: Record<string, string> }

export const CLUSTERS = {
  memory: {
    importLines: [],
    env: {},
  },
  valkey: {
    importLines: ["import { MemoryCluster } from '@newt-js/core/cluster/memory'", "import { ValkeyCluster } from '@newt-js/core/cluster/valkey'"],
    expression: "data === 'memory' ? new MemoryCluster() : new ValkeyCluster(Bun.env.VALKEY_URL)",
    env: { VALKEY_URL: 'redis://localhost:6379' },
  },
} satisfies Record<string, ClusterTemplate>

export type ClusterName = keyof typeof CLUSTERS
