import { CommandError } from '../../commands/command-error/command-error'

export type PieceNames = { folder: string, camel: string, type: string, words: string }

const EXAMPLES: Record<string, string> = {
  'an event': 'shipped or price-changed',
  'an error': 'not-paid or order-already-paid',
  'a value object': 'email or postal-code',
  'a service': 'send-email or exchange-rates',
  'a use case': 'ship or mark-paid',
}

const KEBAB = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/

const capital = (word: string) => word[0]!.toUpperCase() + word.slice(1)

/** The names of a piece of a module (an event, an error, a value object, a service) from its file's, `price-changed`. */
export function pieceNames(name: string, kind: string): PieceNames {
  if (!KEBAB.test(name)) {
    throw new CommandError(`'${name}' cannot name ${kind}: lowercase words joined by -, as in ${EXAMPLES[kind] ?? 'price-changed'}`)
  }
  const words = name.split('-')
  const type = words.map(capital).join('')
  return { folder: name, camel: type[0]!.toLowerCase() + type.slice(1), type, words: words.join(' ') }
}
