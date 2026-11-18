import { CommandError }       from '../../commands/command-error/command-error'
import type { FeatureNames }  from '../feature-names/feature-names'
import { RESERVED_WORDS }     from '../reserved-words/reserved-words'
import { TEMPLATE_TYPES }     from '../template-names/template-names'
import { TEMPLATE_VARIABLES } from '../template-names/template-names'

/**
 * Every name a module of a feature goes by: `module`, `type` and `plural` in its code;
 * `name` (`campaigns[template]`) for its use cases, events and queues; `table`
 * (`campaigns$template`); `migration`, its table's in a file's name; `path`, its routes'.
 */
export type ModuleNames = { feature: FeatureNames, folder: string, module: string, name: string, type: string, table: string, migration: string, words: string, plural: string, path: string }

const KEBAB = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/

const MAX_TABLE = 63

const capital = (word: string) => word[0]!.toUpperCase() + word.slice(1)

const camel = (words: string[]) => words.map((word, at) => at === 0 ? word : capital(word)).join('')

/** The plurals the rules below get wrong; any other is given with --plural. */
const IRREGULAR: Record<string, string> = { child: 'children', person: 'people', man: 'men', woman: 'women', mouse: 'mice', goose: 'geese', foot: 'feet', tooth: 'teeth', quiz: 'quizzes', news: 'news', series: 'series', species: 'species' }

const pluralOf = (word: string) => IRREGULAR[word] ?? (/sis$/.test(word) ? `${word.slice(0, -2)}es`
  : /(s|x|z|ch|sh)$/.test(word) ? `${word}es` : /[^aeiou]y$/.test(word) ? `${word.slice(0, -1)}ies` : `${word}s`)

/**
 * Every name a module of `feature` goes by, from its folder's, `price-change`: `priceChange`,
 * `PriceChange`, `prices[priceChange]`, `prices$price_change`, `priceChanges`,
 * `prices/price-changes`. `plural`, in the folder's form, is given when English's rules miss it.
 */
export function moduleNames(feature: FeatureNames, folder: string, given?: string): ModuleNames {
  if (!KEBAB.test(folder)) {
    throw new CommandError(`'${folder}' cannot name a module: lowercase words joined by -, as in order or price-change`)
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
  if (folder === feature.folder) refuse(`it is its feature's name; name it by the one thing it holds, as ${feature.folder.replace(/s$/, '')}`)
  const table = `${feature.table}$${words.join('_')}`
  if (table.length > MAX_TABLE) refuse(`its table, ${table}, would have more than ${MAX_TABLE} characters, more than databases take`)
  return {
    feature,
    folder,
    module: camel(words),
    name: `${feature.camel}[${camel(words)}]`,
    type: capital(camel(words)),
    table,
    migration: `${feature.table}__${words.join('_')}`,
    words: words.join(' '),
    plural: camel(plural),
    path: `${feature.folder}/${plural.join('-')}`,
  }
}
