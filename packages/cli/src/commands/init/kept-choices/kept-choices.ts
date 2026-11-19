import { join }             from 'node:path'
// --------------------------------------------------------
import { backendStores }    from '../../../project/backend-stores/backend-stores'
import { envValues }        from '../../../project/env-values/env-values'
import type { ClusterName } from '../../../templates/backend/clusters'
import type { Stores }      from '../../../templates/stores/stores'

export type AskedChoices = { db?: string | undefined, files?: string | undefined, cluster?: string | undefined, port?: string | undefined }

export type KeptChoices = { stores: Stores, warnings: string[] }

async function clusterOf(backend: string): Promise<ClusterName | undefined> {
  const code = await Bun.file(join(backend, 'src/index.ts')).text().catch(() => null)
  if (code === null) return undefined
  return code.includes('new ValkeyCluster(') ? 'valkey' : 'memory'
}

/** The stores of a backend that is there already, which newt keeps over the ones asked, with a warning for each asked otherwise. */
export async function keptChoices(backend: string, folder: string, asked: AskedChoices, stores: Stores): Promise<KeptChoices> {
  const found = await backendStores(backend).catch(() => ({ database: undefined, files: undefined }))
  const cluster = await clusterOf(backend)
  const env = await Bun.file(join(backend, '.env')).text().catch(() => null)
  const port = env === null ? undefined : envValues(env).get('PORT')
  const at = (file: string) => join(folder, file)
  const differs = (given: string | undefined, kept: string | undefined): kept is string => kept !== undefined && given !== undefined && given !== kept
  return {
    stores: { database: found.database ?? stores.database, files: found.files ?? stores.files, cluster: cluster ?? stores.cluster },
    warnings: [
      ...differs(asked.db, found.database) ? [`${at('package.json')} gives its contexts ${found.database}, and newt kept it: change it by hand to ${asked.db}, and each context's adapter`] : [],
      ...differs(asked.files, found.files) ? [`${at('package.json')} keeps its contexts' files in ${found.files}, and newt kept it: change it by hand to ${asked.files}, and each context's adapter`] : [],
      ...differs(asked.cluster, cluster) ? [`${at('src/index.ts')} runs on the ${cluster} cluster, and newt kept it: change it by hand to run on ${asked.cluster}`] : [],
      ...port !== undefined && asked.port !== undefined && Number(asked.port) !== Number(port) ? [`${at('.env')} has PORT=${port}, and newt kept it: write PORT=${asked.port} in it`] : [],
    ],
  }
}
