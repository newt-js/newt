import type { Command } from '../../commands/command'

export type FoundCommand = { command: Command, rest: string[] }

export function findCommand(args: string[], commands: Command[]): FoundCommand | null {
  const firstFlag = args.findIndex(arg => arg.startsWith('-'))
  const words = firstFlag === -1 ? args : args.slice(0, firstFlag)
  const nameWords = (command: Command) => command.name.split(' ')
  const command = commands
    .filter(command => nameWords(command).every((word, at) => words[at] === word))
    .toSorted((a, b) => nameWords(b).length - nameWords(a).length)[0]
  return command ? { command, rest: args.slice(nameWords(command).length) } : null
}
