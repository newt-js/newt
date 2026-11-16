import type { Ask }     from '../../command'
import { CommandError } from '../../command-error/command-error'

export type ProjectKind = 'backend' | 'monorepo'

const KINDS: ProjectKind[] = ['backend', 'monorepo']

const isKind = (answer: string): answer is ProjectKind => (KINDS as string[]).includes(answer)

const TRIES = 3

/** Asks again on an answer that is neither, a few times. */
export async function askProjectKind(ask: Ask): Promise<ProjectKind> {
  let answer = ''
  for (let tried = 0; tried < TRIES; tried++) {
    answer = (await ask(tried === 0 ? 'A backend or a monorepo?' : `'${answer}' is neither: a backend or a monorepo?`, 'backend')).toLowerCase()
    if (isKind(answer)) return answer
  }
  throw new CommandError(`'${answer}' is neither: answer backend or monorepo`)
}
