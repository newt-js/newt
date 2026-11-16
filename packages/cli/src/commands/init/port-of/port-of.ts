import { CommandError } from '../../command-error/command-error'

export const DEFAULT_PORT = 3000

const MAX_PORT = 65535

export function portOf(given: string | undefined): number {
  if (given === undefined) return DEFAULT_PORT
  const port = Number(given)
  if (!/^\d+$/.test(given) || port < 1 || port > MAX_PORT) {
    throw new CommandError(`'${given}' is not a port: give a number from 1 to ${MAX_PORT}`)
  }
  return port
}
