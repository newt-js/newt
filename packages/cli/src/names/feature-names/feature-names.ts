import { CommandError }       from '../../commands/command-error/command-error'
import { RESERVED_WORDS }     from '../reserved-words/reserved-words'
import { TEMPLATE_TYPES }     from '../template-names/template-names'
import { TEMPLATE_VARIABLES } from '../template-names/template-names'

/** Every name a feature goes by, from its folder's, `sales-orders`: `salesOrders`, `SalesOrders`, `sales_orders`. */
export type FeatureNames = { folder: string, camel: string, type: string, table: string }

const KEBAB = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/

/** What a context already is, its name, its base and how it starts and stops: its features are fields of it too. */
const CONTEXT_MEMBERS = new Set(['name', 'base', 'start', 'stopWorker', 'close', 'stop'])

const capital = (word: string) => word[0]!.toUpperCase() + word.slice(1)

/** A feature's names, from its folder's: in plural, by convention, as in campaigns or sales-orders. */
export function featureNames(folder: string): FeatureNames {
  if (!KEBAB.test(folder)) {
    throw new CommandError(`'${folder}' cannot name a feature: lowercase words joined by -, as in campaigns or sales-orders`)
  }
  const words = folder.split('-')
  const camel = words.map((word, at) => at === 0 ? word : capital(word)).join('')
  const refuse = (why: string) => {
    throw new CommandError(`'${folder}' cannot name a feature: ${why}`)
  }
  if (RESERVED_WORDS.has(camel)) refuse('it is a word JavaScript keeps for itself; name it by what it groups')
  if (TEMPLATE_VARIABLES.has(camel) || TEMPLATE_TYPES.has(capital(camel))) refuse("its code would take a name newt's generated code uses for something else; name it by what it groups")
  if (CONTEXT_MEMBERS.has(camel)) refuse(`its context holds each feature as a field, and ${camel} is already one of a context's; name it by what it groups`)
  if (folder === 'files') refuse("its routes would be under /<context>/api/files, where the context's files are served; name it by what it groups")
  if (folder.startsWith('newt-')) refuse("its tables would start with newt_, and those tables are newt's own")
  return { folder, camel, type: capital(camel), table: words.join('_') }
}
