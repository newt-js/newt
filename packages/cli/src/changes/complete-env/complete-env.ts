import { envValues }          from '../../project/env-values/env-values'
import type { ChangeOutcome } from '../change-outcome'
import type { VirtualFiles }  from '../virtual-files/virtual-files'

/** Adds to an env file the variables it does not define, never changing a value it has; creates it when it is not there. */
export async function completeEnv(path: string, variables: Record<string, string>, files: VirtualFiles): Promise<ChangeOutcome> {
  const text = await files.read(path)
  const defined = envValues(text ?? '')
  const missing = Object.entries(variables).filter(([name]) => !defined.has(name)).map(([name, value]) => `${name}=${value}`)
  if (missing.length === 0) {
    return { status: 'skipped', note: 'up to date', warnings: [] }
  }
  if (text === null) {
    await files.write(path, `${missing.join('\n')}\n`)
    return { status: 'created', warnings: [] }
  }
  const separator = text === '' || text.endsWith('\n') ? '' : '\n'
  await files.write(path, `${text}${separator}${missing.join('\n')}\n`)
  return { status: 'updated', warnings: [] }
}
