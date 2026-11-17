/** How the backend gets its cluster: no `expression` for the platform's own, in memory; `marks` tell it apart in a `src/backend.ts` already there. */
export type ClusterTemplate = { importLines: string[], expression?: string | undefined, marks: string[], env: Record<string, string> }

export const CLUSTERS = {
  memory: {
    importLines: [],
    marks: ['new Platform()', 'new MemoryCluster()'],
    env: {},
  },
  valkey: {
    importLines: ["import { MemoryCluster } from '@newt-js/core/cluster/memory'", "import { ValkeyCluster } from '@newt-js/core/cluster/valkey'"],
    expression: "stores === 'memory' ? new MemoryCluster() : new ValkeyCluster(Bun.env.VALKEY_URL)",
    marks: ['new ValkeyCluster('],
    env: { VALKEY_URL: 'redis://localhost:6379' },
  },
} satisfies Record<string, ClusterTemplate>

export type ClusterName = keyof typeof CLUSTERS
