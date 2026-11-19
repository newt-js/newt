import type { Ask }      from '../../command'
import { backendInRoot } from '../backend-in-root/backend-in-root'

const SUGGESTED = 'api'

const NONE = 'none'

/** The folder of the monorepo's first backend, asked: a name goes in apps/, a path stays as it is, and none leaves the monorepo empty. */
export async function askFirstBackend(ask: Ask): Promise<string | undefined> {
  const answer = (await ask(`Its first backend's name, or ${NONE}?`, SUGGESTED)).trim()
  if (answer.toLowerCase() === NONE) return undefined
  return backendInRoot(answer.includes('/') ? answer : `apps/${answer}`)
}
