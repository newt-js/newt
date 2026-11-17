import { CLUSTERS }         from '../templates/backend/clusters'
import { STORE_DATABASES }  from '../templates/stores/store-databases'
import { STORE_FILES }      from '../templates/stores/store-files'
import { DEFAULT_CLUSTER }  from './cluster-of/cluster-of'
import { DEFAULT_PORT }     from './port-of/port-of'
import { DEFAULT_DATABASE } from './stores-of/stores-of'
import { DEFAULT_FILES }    from './stores-of/stores-of'

export const BACKEND_OPTIONS = {
  port: { type: 'string', value: 'port', description: `The port it serves on, ${DEFAULT_PORT} by default` },
  db: { type: 'string', value: 'database', description: `Its contexts' databases, one each: ${Object.keys(STORE_DATABASES).join(', ')}, ${DEFAULT_DATABASE} by default` },
  files: { type: 'string', value: 'storage', description: `Where its contexts keep files: ${Object.keys(STORE_FILES).join(', ')}, ${DEFAULT_FILES} by default` },
  cluster: { type: 'string', value: 'cluster', description: `What its instances share: ${Object.keys(CLUSTERS).join(' or ')}, ${DEFAULT_CLUSTER} by default` },
} as const
