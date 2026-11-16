import { CLUSTERS }        from '../templates/backend/clusters'
import { DEFAULT_CLUSTER } from './cluster-of/cluster-of'
import { DEFAULT_PORT }    from './port-of/port-of'

export const BACKEND_OPTIONS = {
  port: { type: 'string', value: 'port', description: `The port it serves on, ${DEFAULT_PORT} by default` },
  cluster: { type: 'string', value: 'cluster', description: `What its instances share: ${Object.keys(CLUSTERS).join(' or ')}, ${DEFAULT_CLUSTER} by default` },
} as const
