import { CLUSTERS }         from '../../../templates/backend/clusters'
import type { ClusterName } from '../../../templates/backend/clusters'
import { CommandError }     from '../../command-error/command-error'

export const DEFAULT_CLUSTER: ClusterName = 'memory'

const isCluster = (name: string): name is ClusterName => Object.hasOwn(CLUSTERS, name)

export function clusterOf(given: string | undefined): ClusterName {
  if (given === undefined) return DEFAULT_CLUSTER
  if (!isCluster(given)) {
    throw new CommandError(`'${given}' is not a cluster: ${Object.keys(CLUSTERS).join(' or ')}`)
  }
  return given
}
