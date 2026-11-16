export type ClusterTemplate = { importLine: string, expression: string, env: Record<string, string> }

export const CLUSTERS = {
  memory: {
    importLine: "import { MemoryCluster } from '@newt-js/core/cluster/memory'",
    expression: 'new MemoryCluster()',
    env: {},
  },
  valkey: {
    importLine: "import { ValkeyCluster } from '@newt-js/core/cluster/valkey'",
    expression: 'new ValkeyCluster(Bun.env.VALKEY_URL)',
    env: { VALKEY_URL: 'redis://localhost:6379' },
  },
} satisfies Record<string, ClusterTemplate>

export type ClusterName = keyof typeof CLUSTERS
