import { ESLint }                  from 'eslint'
import { Linter }                  from 'eslint'
import { defineConfig }            from 'eslint/config'
import { isAbsolute }              from 'node:path'
import { posix }                   from 'node:path'
import { default as tseslint }     from 'typescript-eslint'
// --------------------------------------------------------
import { absolute }                from './paths/paths'
import { slashed }                 from './paths/paths'
import { appImports }              from './rules/app-imports/app-imports'
import type { Uses }               from './rules/context-imports/context-imports'
import { assertUsesTree }          from './rules/context-imports/context-imports'
import { contextImports }          from './rules/context-imports/context-imports'
import { entityMethodParams }      from './rules/entity-method-params/entity-method-params'
import { featureImports }          from './rules/feature-imports/feature-imports'
import { frameworkTables }         from './rules/framework-tables/framework-tables'
import { moduleEntity }            from './rules/module-entity/module-entity'
import { moduleFiles }             from './rules/module-files/module-files'
import { moduleImports }           from './rules/module-imports/module-imports'
import { moduleNames }             from './rules/module-names/module-names'
import { modulePlace }             from './rules/module-place/module-place'
import { moduleTransactions }      from './rules/module-transactions/module-transactions'
import { keepNoDisable }           from './rules/no-disable/keep-no-disable'
import { noDisable }               from './rules/no-disable/no-disable'
import { reactionQueue }           from './rules/reaction-queue/reaction-queue'
import { repositoryPublicMethods } from './rules/repository-public-methods/repository-public-methods'
import { routeBodyUnchecked }      from './rules/route-body-unchecked/route-body-unchecked'
import { routeContext }            from './rules/route-context/route-context'
import { schemaImports }           from './rules/schema-imports/schema-imports'
import { useCaseFiles }            from './rules/use-case-files/use-case-files'
import { useCaseParams }           from './rules/use-case-params/use-case-params'
import { useCasePublicMethods }    from './rules/use-case-public-methods/use-case-public-methods'
import { useCaseReads }            from './rules/use-case-reads/use-case-reads'

/** The rules of newt that no other plugin has, as ESLint takes them: typescript-eslint's types of a rule are not ESLint's, though ESLint runs them. */
export const plugin = {
  meta: { name: '@newt-js/lint' },
  rules: {
    'context-imports': contextImports,
    'entity-method-params': entityMethodParams,
    'feature-imports': featureImports,
    'module-place': modulePlace,
    'framework-tables': frameworkTables,
    'app-imports': appImports,
    'module-entity': moduleEntity,
    'module-files': moduleFiles,
    'module-imports': moduleImports,
    'module-names': moduleNames,
    'module-transactions': moduleTransactions,
    'no-disable': noDisable,
    'reaction-queue': reactionQueue,
    'repository-public-methods': repositoryPublicMethods,
    'route-body-unchecked': routeBodyUnchecked,
    'route-context': routeContext,
    'schema-imports': schemaImports,
    'use-case-files': useCaseFiles,
    'use-case-params': useCaseParams,
    'use-case-public-methods': useCasePublicMethods,
    'use-case-reads': useCaseReads,
  },
  processors: { 'keep-no-disable': keepNoDisable },
} as unknown as ESLint.Plugin

/** The parser of TypeScript the lint reads with, for an app's own configs. */
export const parser = tseslint.parser

/** The typescript-eslint this package carries: an app that wants its configs takes them from here, since ESLint refuses two plugins under one name. */
export { tseslint }

/** Where a module's files are: anything under a folder of a feature's, `features/<feature>/<module>/`. */
const MODULES = '**/features/*/*/**/*.ts'

/** newt's style, which no rule of its own says: every `if`, `else` and loop takes braces, and its body goes on lines of its own. Both fix themselves. */
export const STYLE: Linter.RulesRecord = {
  'curly': ['error', 'all'],
  'brace-style': ['error', '1tbs', { allowSingleLine: false }],
}

/** The rules of other plugins the preset turns on: `newt/no-disable` keeps them on, as it keeps newt's. */
const OTHERS: Linter.RulesRecord = {
  '@typescript-eslint/no-floating-promises': 'error',
  // Nor one handed where nobody awaits it: an async callback to setInterval, an event or a forEach.
  '@typescript-eslint/no-misused-promises': 'error',
  ...STYLE,
}

export type NewtLintOptions = {
  /** The globs of the files it lints: every `.ts` file by default. */
  files?: string[]
  /** The folder of the contexts and, if given, which ones each one uses; without `uses`, each context's `<name>.context.ts` says it. */
  contexts?: { folder: string, uses?: Uses }
  /** The folder of the config, which its globs and folders are read from: ESLint's cwd without it. */
  root?: string
}

/**
 * The lint of an application built with newt. A module is a folder in a feature's
 * `modules/`, `<context>/features/<feature>/modules/<module>/`. What it checks keeps every module
 * the same, whoever writes it, a person or an agent.
 *
 * ```ts
 * // eslint.config.ts, run with `bun --bun eslint`
 * import { newt } from '@newt-js/lint'
 * export default newt({ root: import.meta.dirname, contexts: { folder: 'src/contexts' } })
 * ```
 */
export function newt({ files = ['**/*.ts'], contexts, root }: NewtLintOptions = {}): Linter.Config[] {
  const base = absolute(root ?? process.cwd(), process.cwd())
  if (contexts?.uses) assertUsesTree(contexts.uses)
  const folder = contexts ? absolute(contexts.folder, base) : undefined
  const inside = folder === undefined ? undefined : posix.relative(base, folder)
  // Without a root, a relative folder is read from ESLint's cwd, as the globs are without a config file.
  const given = root === undefined && !isAbsolute(slashed(contexts?.folder ?? '')) ? inside : folder
  const inContexts = contexts && files.map(pattern => [pattern, `${inside ? `${inside}/` : ''}**/*.ts`])
  const contextRules: Linter.Config[] = contexts && inContexts ? [{
    files: inContexts,
    rules: {
      'newt/context-imports': ['error', { folder: given, ...contexts.uses ? { uses: contexts.uses } : {} }],
      'newt/feature-imports': ['error', { folder: given }],
      'newt/module-place': ['error', { folder: given }],
      'newt/route-context': ['error', { folder: given }],
    },
  }, {
    // A context's file outside its modules imports what it composes, but its barrels re-export only what a module offers.
    files: inContexts,
    ignores: [MODULES],
    rules: { 'newt/module-imports': 'error' },
  }] : []
  const appRules: Linter.Config[] = contexts ? [{
    // A context's app is .ts and .tsx, each its own project, whose aliases resolve as in the rest.
    files: [`${inside ? `${inside}/` : ''}*/app/**/*.{ts,tsx}`],
    languageOptions: { parser: tseslint.parser, parserOptions: { projectService: true } },
    processor: keepNoDisable,
    linterOptions: { reportUnusedDisableDirectives: 'error' },
    plugins: { newt: plugin },
    ...root === undefined ? {} : { settings: { newt: { root: base } } },
    rules: {
      'newt/app-imports': ['error', { folder: given }],
      'newt/no-disable': ['error', { rules: Object.keys(OTHERS) }],
    },
  }] : []
  return defineConfig(
    { ignores: ['**/dist/**', '**/node_modules/**'] },
    {
      files,
      languageOptions: { parser: tseslint.parser, parserOptions: { projectService: true } },
      // A comment that turns every rule off turns newt/no-disable off too: its processor says what that rule found all the same.
      processor: keepNoDisable,
      linterOptions: { reportUnusedDisableDirectives: 'error' },
      plugins: { 'newt': plugin, '@typescript-eslint': tseslint.plugin as unknown as ESLint.Plugin },
      ...root === undefined ? {} : { settings: { newt: { root: base } } },
      rules: {
        ...OTHERS,
        'newt/no-disable': ['error', { rules: Object.keys(OTHERS) }],
        // By the file's name, wherever it is: a module outside modules/, one every context shares, too.
        'newt/use-case-public-methods': 'error',
        'newt/use-case-params': 'error',
        'newt/use-case-reads': 'error',
        'newt/route-body-unchecked': 'error',
        'newt/framework-tables': 'error',
        'newt/repository-public-methods': 'error',
      },
    },
    ...contextRules,
    ...appRules,
    {
      // A module's file among those it lints: an inner list is every pattern of it at once.
      files: files.map(pattern => [pattern, MODULES]),
      rules: {
        'newt/module-entity': 'error',
        'newt/module-files': 'error',
        'newt/module-imports': 'error',
        'newt/module-names': 'error',
        'newt/entity-method-params': 'error',
        'newt/reaction-queue': 'error',
        'newt/schema-imports': 'error',
        'newt/use-case-files': 'error',
        'newt/module-transactions': 'error',
        // With the folder of the contexts, every file of a context's is checked above.
        ...contexts ? {} : { 'newt/route-context': 'error' },
      },
    },
  )
}
