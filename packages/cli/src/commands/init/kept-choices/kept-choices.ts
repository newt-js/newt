import { join }          from 'node:path'
// --------------------------------------------------------
import { backendStores } from '../../../project/backend-stores/backend-stores'
import { envValues }     from '../../../project/env-values/env-values'

export type AskedChoices = { db?: string | undefined, files?: string | undefined, port?: string | undefined }

/** Warnings for the choices asked of a backend that is there already and was made with others, which newt keeps. */
export async function keptChoices(backend: string, folder: string, asked: AskedChoices): Promise<string[]> {
  const stores = await backendStores(backend).catch(() => null)
  const env = await Bun.file(join(backend, '.env')).text().catch(() => null)
  const port = env === null ? undefined : envValues(env).get('PORT')
  const at = (file: string) => join(folder, file)
  return [
    ...stores?.database && asked.db !== undefined && asked.db !== stores.database ? [`${at('src/stores.ts')} opens ${stores.database}, and newt kept it: change it by hand to open ${asked.db}`] : [],
    ...stores?.files && asked.files !== undefined && asked.files !== stores.files ? [`${at('src/stores.ts')} keeps files in ${stores.files}, and newt kept it: change it by hand to keep them in ${asked.files}`] : [],
    ...port !== undefined && asked.port !== undefined && Number(asked.port) !== Number(port) ? [`${at('.env')} has PORT=${port}, and newt kept it: write PORT=${asked.port} in it`] : [],
  ]
}
