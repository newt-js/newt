import { CommandError }    from '../../commands/command-error/command-error'
import type { PieceNames } from '../piece-names/piece-names'
import { pieceNames }      from '../piece-names/piece-names'
import { RESERVED_WORDS }  from '../reserved-words/reserved-words'

/** What every module has, from Module or from newt's template. */
const MODULE_MEMBERS = ['name', 'useCaseRunner', 'on', 'deps', 'events']

/** The names of a use case, from its file's, `mark-paid`; never one a module or JavaScript keeps. */
export function useCaseNames(name: string): PieceNames {
  const useCase = pieceNames(name, 'a use case')
  if (MODULE_MEMBERS.includes(useCase.camel) || RESERVED_WORDS.has(useCase.camel)) {
    throw new CommandError(`'${name}' cannot name a use case: ${useCase.camel} is a name every module or JavaScript keeps; name it by what it does`)
  }
  return useCase
}
