import { CommandError } from '../../commands/command-error/command-error'

export const ERROR_KINDS = {
  'validation': 'ValidationError',
  'unauthorized': 'UnauthorizedError',
  'forbidden': 'ForbiddenError',
  'not-found': 'NotFoundError',
  'conflict': 'ConflictError',
} as const

export type ErrorKind = keyof typeof ERROR_KINDS

const KINDS = Object.keys(ERROR_KINDS).join(', ')

const isKind = (name: string): name is ErrorKind => Object.hasOwn(ERROR_KINDS, name)

export function errorKindOf(given: string | undefined): ErrorKind {
  if (given === undefined) {
    throw new CommandError(`newt add error needs --kind, which says what HTTP answers it with: ${KINDS}`)
  }
  if (!isKind(given)) {
    throw new CommandError(`'${given}' is not a kind of error: ${KINDS}`)
  }
  return given
}
