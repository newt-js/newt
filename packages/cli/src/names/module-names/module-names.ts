import { CommandError }       from '../../commands/command-error/command-error'
import { RESERVED_WORDS }     from '../reserved-words/reserved-words'
import { TEMPLATE_TYPES }     from '../template-names/template-names'
import { TEMPLATE_VARIABLES } from '../template-names/template-names'

/**
 * Every name a module goes by: `module` (and `name`, for its use cases, events and
 * queues), `type` and `plural` in its code; `table`; `migration`, its table's in a
 * file's name; `path`, its routes'.
 */
export type ModuleNames = { folder: string, module: string, name: string, type: string, table: string, migration: string, words: string, plural: string, path: string }

const KEBAB = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/

const MAX_TABLE = 63

/** What a context already is, its name, its base and how it starts and stops: its modules are fields of it too. */
const CONTEXT_MEMBERS = new Set(['name', 'base', 'start', 'stopWorker', 'close', 'stop'])

const capital = (word: string) => word[0]!.toUpperCase() + word.slice(1)

const camel = (words: string[]) => words.map((word, at) => at === 0 ? word : capital(word)).join('')

/** The plurals the rules below get wrong; any other is given with --plural. */
const IRREGULAR: Record<string, string> = { child: 'children', person: 'people', man: 'men', woman: 'women', mouse: 'mice', goose: 'geese', foot: 'feet', tooth: 'teeth', quiz: 'quizzes', news: 'news', series: 'series', species: 'species' }

const pluralOf = (word: string) => IRREGULAR[word] ?? (/sis$/.test(word) ? `${word.slice(0, -2)}es`
  : /(s|x|z|ch|sh)$/.test(word) ? `${word}es` : /[^aeiou]y$/.test(word) ? `${word.slice(0, -1)}ies` : `${word}s`)

/**
 * Every name a module goes by, from its folder's, `price-change`: `priceChange`,
 * `PriceChange`, `price_change`, `priceChanges`, `price-changes`. `plural`, in the
 * folder's form, is given when English's rules miss it.
 */
export function moduleNames(folder: string, given?: string): ModuleNames {
  if (!KEBAB.test(folder)) {
    throw new CommandError(`'${folder}' cannot name a module: lowercase words joined by -, as in order or oauth-signing-key`)
  }
  if (given !== undefined && !KEBAB.test(given)) {
    throw new CommandError(`'${given}' cannot be the plural of ${folder}: lowercase words joined by -, as in people or sales-people`)
  }
  const words = folder.split('-')
  const plural = given?.split('-') ?? [...words.slice(0, -1), pluralOf(words.at(-1)!)]
  const refuse = (why: string) => {
    throw new CommandError(`'${folder}' cannot name a module: ${why}`)
  }
  if (RESERVED_WORDS.has(camel(words))) refuse('it is a word JavaScript keeps for itself; name it by what it holds')
  if (TEMPLATE_VARIABLES.has(camel(words)) || TEMPLATE_VARIABLES.has(camel(plural)) || TEMPLATE_TYPES.has(capital(camel(words)))) {
    refuse("its code would take a name newt's generated code uses for something else; name it by what it holds")
  }
  if (CONTEXT_MEMBERS.has(camel(words))) refuse(`its context holds each module as a field, and ${camel(words)} is already one of a context's; name it by what it holds`)
  if (folder === 'newt' || folder.startsWith('newt-')) refuse("its table would start with newt_, and those tables are newt's own")
  if (plural.join('-') === 'files') refuse("its routes would be under /<context>/api/files, where the context's files are served; name it by what it holds")
  const table = words.join('_')
  if (table.length > MAX_TABLE) refuse(`its table, ${table}, would have more than ${MAX_TABLE} characters, more than databases take`)
  return {
    folder,
    module: camel(words),
    name: camel(words),
    type: capital(camel(words)),
    table,
    migration: table,
    words: words.join(' '),
    plural: camel(plural),
    path: plural.join('-'),
  }
}
