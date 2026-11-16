import { CommandError }       from '../../commands/command-error/command-error'
import { RESERVED_WORDS }     from '../reserved-words/reserved-words'
import { TEMPLATE_TYPES }     from '../template-names/template-names'
import { TEMPLATE_VARIABLES } from '../template-names/template-names'

export type ModuleNames = { folder: string, module: string, type: string, table: string, words: string, plural: string, path: string }

const KEBAB = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/

const MAX_TABLE = 63

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
  const refuse = (why: string) => {
    throw new CommandError(`'${folder}' cannot name a module: ${why}`)
  }
  if (RESERVED_WORDS.has(camel(words))) refuse('it is a word JavaScript keeps for itself; name it by what it holds')
  if (TEMPLATE_VARIABLES.has(camel(words)) || TEMPLATE_VARIABLES.has(camel(plural)) || TEMPLATE_TYPES.has(capital(camel(words)))) {
    refuse("its code would take a name newt's generated code uses for something else; name it by what it holds")
  }
  if (folder.startsWith('newt-')) refuse('its table would start with newt_, and those tables are newt\'s own')
  if (words.join('_').length > MAX_TABLE) refuse(`its table would have more than ${MAX_TABLE} characters, more than databases take`)
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
