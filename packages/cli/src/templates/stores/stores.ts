import type { ClusterName }  from '../backend/clusters'
import type { DatabaseKind } from './store-databases'
import type { FilesKind }    from './store-files'

export type Stores = { cluster: ClusterName, database: DatabaseKind, files: FilesKind }
