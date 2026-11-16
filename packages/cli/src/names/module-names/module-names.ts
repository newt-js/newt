import { CommandError } from '../../commands/command-error/command-error'

export type ModuleNames = { folder: string, module: string, type: string, table: string, words: string, plural: string, path: string }

const KEBAB = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/

const capital = (word: string) => word[0]!.toUpperCase() + word.slice(1)

const camel = (words: string[]) => words.map((word, at) => at === 0 ? word : capital(word)).join('')

const pluralOf = (word: string) => /(s|x|z|ch|sh)$/.test(word) ? `${word}es` : /[^aeiou]y$/.test(word) ? `${word.slice(0, -1)}ies` : `${word}s`

/** Every name a module goes by, from its folder's, `price-change`: `priceChange`, `PriceChange`, `price_change`, `priceChanges`, `price-changes`. */
export function moduleNames(folder: string): ModuleNames {
  if (!KEBAB.test(folder)) {
    throw new CommandError(`'${folder}' cannot name a module: lowercase words joined by -, as in order or price-change`)
  }
  const words = folder.split('-')
  const plural = [...words.slice(0, -1), pluralOf(words.at(-1)!)]
  return {
    folder,
    module: camel(words),
    type: capital(camel(words)),
    table: words.join('_'),
    words: words.join(' '),
    plural: camel(plural),
    path: plural.join('-'),
  }
}
