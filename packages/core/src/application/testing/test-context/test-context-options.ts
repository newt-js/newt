import { Cluster }            from '../../cluster/cluster'
import { ContextBaseOptions } from '../../context/context-base/context-base-options'

export type TestContextOptions = Omit<ContextBaseOptions, 'platform' | 'clock'> & {
  cluster: Cluster
  at?: Date | string
}
