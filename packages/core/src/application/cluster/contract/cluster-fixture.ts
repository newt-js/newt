import { Cluster } from '../cluster'

export type ClusterFixture = {
  open(): Promise<Cluster>
  close?(cluster: Cluster): Promise<void>
}
