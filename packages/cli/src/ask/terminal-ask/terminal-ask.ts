import type { Ask }     from '../../commands/command'
import { CommandError } from '../../commands/command-error/command-error'

/** Asks in the terminal; an empty answer takes the suggested one, and the end of input (Ctrl-D) cancels the command. */
export const terminalAsk: Ask = async (question, suggested) => {
  const answer = prompt(`${question} (${suggested})`)
  if (answer === null) throw new CommandError('Cancelled: newt wrote nothing')
  return answer.trim() || suggested
}
