import type { Cluster }            from '../../cluster/cluster'
import type { ContextBaseOptions } from '../../context/context-base/context-base-options'

export type TestContextOptions = Omit<ContextBaseOptions, 'platform' | 'clock' | 'email'> & {
  cluster: Cluster
  at?: Date | string
}
