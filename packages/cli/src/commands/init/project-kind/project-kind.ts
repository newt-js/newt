import type { Ask }     from '../../command'
import { CommandError } from '../../command-error/command-error'

export type ProjectKind = 'backend' | 'monorepo'

const KINDS: ProjectKind[] = ['backend', 'monorepo']

const isKind = (answer: string): answer is ProjectKind => (KINDS as string[]).includes(answer)

export async function askProjectKind(ask: Ask): Promise<ProjectKind> {
  const answer = (await ask(`A backend or a monorepo? (${KINDS.join(' or ')})`, 'backend')).toLowerCase()
  if (!isKind(answer)) {
    throw new CommandError(`'${answer}' is neither: answer backend or monorepo`)
  }
  return answer
}
