import { default as stylistic }    from '@stylistic/eslint-plugin'
import { ESLint }                  from 'eslint'
import { Linter }                  from 'eslint'
import { defineConfig }            from 'eslint/config'
import { isAbsolute }              from 'node:path'
import { posix }                   from 'node:path'
import { default as tseslint }     from 'typescript-eslint'
// --------------------------------------------------------
import { absolute }                from './paths/paths'
import { slashed }                 from './paths/paths'
import { appComponents }           from './rules/app-components/app-components'
import { appFiles }                from './rules/app-files/app-files'
import { appHtml }                 from './rules/app-html/app-html'
import { appImports }              from './rules/app-imports/app-imports'
import { appSignalReads }          from './rules/app-signal-reads/app-signal-reads'
import { appSize }                 from './rules/app-size/app-size'
import { appStyles }               from './rules/app-styles/app-styles'
import type { Uses }               from './rules/context-imports/context-imports'
import { assertUsesTree }          from './rules/context-imports/context-imports'
import { contextImports }          from './rules/context-imports/context-imports'
import { entityMethodParams }      from './rules/entity-method-params/entity-method-params'
import { frameworkTables }         from './rules/framework-tables/framework-tables'
import { importsAndExports }       from './rules/imports-and-exports/imports-and-exports'
import { moduleEntity }            from './rules/module-entity/module-entity'
import { moduleFiles }             from './rules/module-files/module-files'
import { moduleImports }           from './rules/module-imports/module-imports'
import { moduleIndex }             from './rules/module-index/module-index'
import { moduleNames }             from './rules/module-names/module-names'
import { modulePlace }             from './rules/module-place/module-place'
import { moduleTransactions }      from './rules/module-transactions/module-transactions'
import { keepNoDisable }           from './rules/no-disable/keep-no-disable'
import { noDisable }               from './rules/no-disable/no-disable'
import { publishedModules }        from './rules/published-modules/published-modules'
import { reactionQueue }           from './rules/reaction-queue/reaction-queue'
import { repositoryPublicMethods } from './rules/repository-public-methods/repository-public-methods'
import { routeBodyUnchecked }      from './rules/route-body-unchecked/route-body-unchecked'
import { routeContext }            from './rules/route-context/route-context'
import { routePublicRateLimit }    from './rules/route-public-rate-limit/route-public-rate-limit'
import { schemaImports }           from './rules/schema-imports/schema-imports'
import { useCaseBatched }          from './rules/use-case-batched/use-case-batched'
import { useCaseFiles }            from './rules/use-case-files/use-case-files'
import { useCaseParams }           from './rules/use-case-params/use-case-params'
import { useCasePublicMethods }    from './rules/use-case-public-methods/use-case-public-methods'
import { useCaseReads }            from './rules/use-case-reads/use-case-reads'
import { useCaseResolved }         from './rules/use-case-resolved/use-case-resolved'

/** The rules of newt that no other plugin has, as ESLint takes them: typescript-eslint's types of a rule are not ESLint's, though ESLint runs them. */
export const plugin = {
  meta: { name: '@newt-js/lint' },
  rules: {
    'context-imports': contextImports,
    'entity-method-params': entityMethodParams,
    'module-place': modulePlace,
    'framework-tables': frameworkTables,
    'imports-and-exports': importsAndExports,
    'app-components': appComponents,
    'app-files': appFiles,
    'app-html': appHtml,
    'app-imports': appImports,
    'app-signal-reads': appSignalReads,
    'app-size': appSize,
    'app-styles': appStyles,
    'module-entity': moduleEntity,
    'module-files': moduleFiles,
    'module-imports': moduleImports,
    'module-index': moduleIndex,
    'module-names': moduleNames,
    'module-transactions': moduleTransactions,
    'no-disable': noDisable,
    'published-modules': publishedModules,
    'reaction-queue': reactionQueue,
    'repository-public-methods': repositoryPublicMethods,
    'route-body-unchecked': routeBodyUnchecked,
    'route-public-rate-limit': routePublicRateLimit,
    'route-context': routeContext,
    'schema-imports': schemaImports,
    'use-case-files': useCaseFiles,
    'use-case-params': useCaseParams,
    'use-case-public-methods': useCasePublicMethods,
    'use-case-reads': useCaseReads,
    'use-case-resolved': useCaseResolved,
    'use-case-batched': useCaseBatched,
  },
  processors: { 'keep-no-disable': keepNoDisable },
} as unknown as ESLint.Plugin

/** The parser of TypeScript the lint reads with, for an app's own configs. */
export const parser = tseslint.parser

/** The typescript-eslint this package carries: an app that wants its configs takes them from here, since ESLint refuses two plugins under one name. */
export { tseslint }

/** Where a module's files are: anything under a folder of a context's `modules/`. */
const MODULES = '**/modules/*/**/*.ts'

/**
 * newt's style, which no rule of its own says: braces on every `if`, `else` and loop,
 * each body on lines of its own, a blank line inside a class at each end, and lines of
 * 160 characters at most, strings too: only a URL, a regular expression or an import, aligned
 * at `from` by newt's own rule, may run longer.
 * All but the last fix themselves.
 */
export const STYLE: Linter.RulesRecord = {
  'curly': ['error', 'all'],
  'brace-style': ['error', '1tbs', { allowSingleLine: false }],
  '@stylistic/padded-blocks': ['error', { classes: 'always' }],
  '@stylistic/max-len': ['error', { code: 160, ignoreUrls: true, ignoreRegExpLiterals: true, ignorePattern: '^import\\s' }],
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
  /** The folder of the UI a project's apps share, its layouts above all: every app may import it. */
  ui?: string
}

/**
 * The lint of an application built with newt. A module is a folder of a context's
 * `modules/`, `<context>/modules/<module>/`. What it checks keeps every module
 * the same, whoever writes it, a person or an agent.
 *
 * ```ts
 * // eslint.config.ts, run with `bun --bun eslint`
 * import { newt } from '@newt-js/lint'
 * export default newt({ root: import.meta.dirname, contexts: { folder: 'src/contexts' } })
 * ```
 */
export function newt({ files = ['**/*.ts'], contexts, root, ui }: NewtLintOptions = {}): Linter.Config[] {
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
      'newt/published-modules': ['error', { folder: given }],
      'newt/module-place': ['error', { folder: given }],
      'newt/route-context': ['error', { folder: given }],
    },
  }, {
    // A context's file outside its modules imports what it composes, but its barrels re-export only what a module offers.
    files: inContexts,
    ignores: [MODULES],
    rules: { 'newt/module-imports': 'error' },
  }] : []
  // Read as the contexts' folder is: from the root, or from ESLint's cwd without one.
  const sharedUi = ui === undefined ? undefined : root === undefined ? ui : absolute(ui, base)
  const uiRules: Linter.Config[] = ui === undefined ? [] : [{
    // The shared UI is .ts and .tsx too, checked as the rest of the project's code.
    files: [`${posix.relative(base, absolute(ui, base))}/**/*.{ts,tsx}`],
    languageOptions: { parser: tseslint.parser, parserOptions: { projectService: true } },
    processor: keepNoDisable,
    linterOptions: { reportUnusedDisableDirectives: 'error' },
    plugins: { 'newt': plugin, '@typescript-eslint': tseslint.plugin as unknown as ESLint.Plugin, '@stylistic': stylistic as unknown as ESLint.Plugin },
    rules: { ...OTHERS, 'newt/no-disable': ['error', { rules: Object.keys(OTHERS) }], 'newt/imports-and-exports': 'error' },
  }]
  const appRules: Linter.Config[] = contexts ? [{
    // A context's app is .ts and .tsx, each its own project, whose aliases resolve as in the rest.
    files: [`${inside ? `${inside}/` : ''}*/app/**/*.{ts,tsx}`],
    languageOptions: { parser: tseslint.parser, parserOptions: { projectService: true } },
    processor: keepNoDisable,
    linterOptions: { reportUnusedDisableDirectives: 'error' },
    plugins: { newt: plugin },
    ...root === undefined ? {} : { settings: { newt: { root: base } } },
    rules: {
      'newt/app-components': ['error', { folder: given }],
      'newt/app-files': ['error', { folder: given }],
      'newt/app-html': ['error', { folder: given }],
      'newt/app-imports': ['error', { folder: given, ...ui === undefined ? {} : { ui: sharedUi } }],
      'newt/app-signal-reads': ['error', { folder: given }],
      'newt/app-size': ['error', { folder: given }],
      'newt/app-styles': ['error', { folder: given }],
      'newt/imports-and-exports': 'error',
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
      plugins: { 'newt': plugin, '@typescript-eslint': tseslint.plugin as unknown as ESLint.Plugin, '@stylistic': stylistic as unknown as ESLint.Plugin },
      ...root === undefined ? {} : { settings: { newt: { root: base } } },
      rules: {
        ...OTHERS,
        'newt/no-disable': ['error', { rules: Object.keys(OTHERS) }],
        'newt/imports-and-exports': 'error',
        // By the file's name, wherever it is: a module out of its context's folder, one every context shares, too.
        'newt/use-case-public-methods': 'error',
        'newt/use-case-params': 'error',
        'newt/use-case-reads': 'error',
        'newt/use-case-resolved': 'error',
        'newt/use-case-batched': 'error',
        'newt/route-body-unchecked': 'error',
        'newt/route-public-rate-limit': 'error',
        'newt/framework-tables': 'error',
        'newt/repository-public-methods': 'error',
      },
    },
    ...contextRules,
    ...appRules,
    ...uiRules,
    {
      // A module's file among those it lints: an inner list is every pattern of it at once.
      files: files.map(pattern => [pattern, MODULES]),
      rules: {
        'newt/module-entity': 'error',
        'newt/module-files': 'error',
        'newt/module-imports': 'error',
        'newt/module-index': 'error',
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
