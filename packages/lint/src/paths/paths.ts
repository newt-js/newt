import { TSESLint }     from '@typescript-eslint/utils'
import { TSESTree }     from '@typescript-eslint/utils'
import { realpathSync } from 'node:fs'
import { statSync }     from 'node:fs'
import { basename }     from 'node:path'
import { dirname }      from 'node:path'
import { isAbsolute }   from 'node:path'
import { posix }        from 'node:path'
import { resolve }      from 'node:path'

/** What a rule of newt is given: its options, the file and the source it reads. */
export type Context = Readonly<TSESLint.RuleContext<string, readonly unknown[]>>

/** Where a file of a module is: its context's folder, its feature's (`null` for a module of none), its module, and its path inside the module. */
export type Place = { context: string, feature: string | null, module: string, inside: string }

/** That two places are in one module: of one context, one feature and one name. */
export function sameModule(one: Place, other: Place): boolean {
  return one.context === other.context && one.feature === other.feature && one.module === other.module
}

/** A file's path with forward slashes, whatever the system. */
export function slashed(path: string): string {
  return path.replaceAll('\\', '/')
}

/** `price-change` → `priceChange`: a module's name from its folder's. */
export function camelCase(kebab: string): string {
  return kebab.replace(/-(\w)/g, (_, letter: string) => letter.toUpperCase())
}

/** `price-change` → `PriceChange`: the name of a module's classes, from its folder's. */
export function pascalCase(kebab: string): string {
  const camel = camelCase(kebab)
  return `${camel.charAt(0).toUpperCase()}${camel.slice(1)}`
}

/** A folder as an absolute path with forward slashes and no trailing one: a relative one is read from `base`. */
export function absolute(folder: string, base: string): string {
  return slashed(resolve(base, slashed(folder))).replace(/(?<=.)\/$/, '')
}

/**
 * An absolute path as it really is, with forward slashes: through the links on its way,
 * so two ways of writing it compare equal (on macOS the temporary folders are under
 * `/var`, a link to `/private/var`). The part of it that is not there (an import without
 * its extension) is kept as it is; a relative path too.
 */
export function real(path: string): string {
  if (!isAbsolute(path)) return path
  const rest: string[] = []
  for (let at = path; ;) {
    try {
      return posix.join(slashed(realpathSync(at)), ...rest)
    } catch {
      const parent = dirname(at)
      if (parent === at) return path
      rest.unshift(basename(at))
      at = parent
    }
  }
}

/** The project's root, from which a `modules/` folder is read: the preset's `root`, or ESLint's cwd without one. */
export function rootOf(context: Context): string {
  const settings = context.settings as { newt?: { root?: string } } | undefined
  return real(absolute(settings?.newt?.root ?? context.cwd, context.cwd))
}

/** A file's path from the project's `root` (absolute), with a leading slash; the path as it is outside it. */
function inProject(file: string, root: string): string {
  const path = slashed(file)
  return root && path.startsWith(`${root}/`) ? path.slice(root.length) : path
}

/**
 * Where a file of a module is: its context (the folder that holds `features/`, or
 * `modules/` for a module of no feature), its feature, its module, and its path inside
 * the module. `null` for a file of no module. The path is read from the project's root,
 * so a project that lives inside a folder named `modules` is not mistaken for one; a
 * `features/` or `modules/` at the project's root has the project itself as its context (`.`).
 */
export function modulePlace(file: string, root = ''): Place | null {
  const whole = real(slashed(file))
  const path = inProject(whole, root)
  const inRoot = path !== whole
  const topFeature = inRoot ? /^\/features\/([^/]+)\/modules\/([^/]+)\/(.+)$/.exec(path) : null
  if (topFeature) return { context: '.', feature: topFeature[1]!, module: topFeature[2]!, inside: topFeature[3]! }
  const ofFeature = /\/([^/]+)\/features\/([^/]+)\/modules\/([^/]+)\/(.+)$/.exec(path)
  if (ofFeature) return { context: ofFeature[1]!, feature: ofFeature[2]!, module: ofFeature[3]!, inside: ofFeature[4]! }
  const top = inRoot ? /^\/modules\/([^/]+)\/(.+)$/.exec(path) : null
  if (top) return { context: '.', feature: null, module: top[1]!, inside: top[2]! }
  const match = /\/([^/]+)\/modules\/([^/]+)\/(.+)$/.exec(path)
  return match ? { context: match[1]!, feature: null, module: match[2]!, inside: match[3]! } : null
}

/** Where a file directly in the folder of the contexts is: in no context, and one no context may import. */
export const ROOT = '(root)'

/**
 * The context a path is in, when contexts are the folders of `contexts` (absolute):
 * `…/contexts/shop/…` is in `shop`, and so is the folder itself. A file directly in
 * `contexts` is in `ROOT`. `null` for a path outside it.
 */
export function contextOf(file: string, contexts: string): string | null {
  const path = real(slashed(file))
  const folder = real(contexts)
  if (!path.startsWith(`${folder}/`)) return null
  const [name, ...rest] = path.slice(folder.length + 1).split('/') as [string, ...string[]]
  if (rest.length > 0 || isFolder(path)) return name
  return /\.[^./]+$/.test(name) || isFile(path) ? ROOT : name
}

function isFolder(path: string): boolean {
  return statSync(path, { throwIfNoEntry: false })?.isDirectory() ?? false
}

/** That a file is there, with one of the extensions an import may leave out. */
function isFile(path: string): boolean {
  return ['.ts', '.tsx', '.mts', '.cts', '.js', '.jsx', '.mjs', '.cjs'].some(extension => statSync(`${path}${extension}`, { throwIfNoEntry: false })?.isFile())
}

/** Where a path of a feature is: its context, its feature, and its path inside the feature. */
export type FeaturePlace = { context: string, feature: string, inside: string }

/**
 * The feature a path is in, when contexts are the folders of `contexts` (absolute):
 * `…/contexts/engagement/features/campaigns/…` is in `campaigns` of `engagement`, and so
 * is the folder itself (`inside` is `''`). `null` for a path in no feature.
 */
export function featurePlace(file: string, contexts: string): FeaturePlace | null {
  const path = real(slashed(file))
  const folder = real(contexts)
  if (!path.startsWith(`${folder}/`)) return null
  const [context, features, feature, ...rest] = path.slice(folder.length + 1).split('/')
  if (context === undefined || features !== 'features' || !feature) return null
  return { context, feature, inside: rest.join('/') }
}

/** The file a relative import points at. */
export function target(file: string, specifier: string): string {
  return posix.normalize(posix.join(posix.dirname(slashed(file)), specifier))
}

/**
 * The file an import points at, without the extension it may be written with: a relative
 * one from the importing file, an alias by the `paths` of the project's tsconfig (only
 * when typescript-eslint builds a program: the preset does). `null` for a package.
 */
export function resolved(context: Context, specifier: string): string | null {
  const path = specifier.startsWith('.') ? target(context.filename, specifier) : specifier.startsWith('/') ? slashed(specifier) : aliased(context, specifier)
  return path?.replace(/\.[cm]?[jt]sx?$/, '') ?? null
}

/**
 * The file an alias of the tsconfig's `paths` points at: the first one it lists, by the
 * longest pattern that matches, from the `baseUrl` if there is one and the tsconfig's
 * folder if not, as TypeScript does.
 */
function aliased(context: Context, specifier: string): string | null {
  const options = context.sourceCode.parserServices?.program?.getCompilerOptions()
  // `pathsBasePath` is TypeScript's own, unlisted in its types: the tsconfig's folder, which `paths` is read from without a `baseUrl`.
  const base = options?.baseUrl ?? (options?.pathsBasePath as string | undefined)
  if (!base || !options?.paths) return null
  const matches = Object.entries(options.paths).flatMap(([pattern, list]) => {
    const first = Array.isArray(list) ? list[0] : undefined
    if (typeof first !== 'string') return []
    const [prefix = '', suffix] = pattern.split('*')
    if (suffix === undefined) return pattern === specifier ? [{ prefix, path: first }] : []
    const fits = specifier.startsWith(prefix) && specifier.endsWith(suffix) && specifier.length >= prefix.length + suffix.length
    return fits ? [{ prefix, path: first.replace('*', specifier.slice(prefix.length, specifier.length - suffix.length)) }] : []
  })
  const [best] = matches.sort((a, b) => b.prefix.length - a.prefix.length)
  return best ? posix.normalize(posix.join(slashed(base), best.path)) : null
}

/**
 * The visitor of every way a file names another: `import` and `export … from`, `import()`
 * (an expression or a type), `import x = require()` and `require()`. `check` gets the
 * node and the path, when it is written as a plain string.
 */
export function importsOf(check: (node: TSESTree.Node, specifier: string) => void): TSESLint.RuleListener {
  const named = (node: TSESTree.Node | null | undefined) => {
    if (node?.type === 'Literal' && typeof node.value === 'string') {
      check(node, node.value)
    } else if (node?.type === 'TemplateLiteral' && node.expressions.length === 0 && node.quasis[0]?.value.cooked != null) {
      check(node, node.quasis[0].value.cooked)
    }
  }
  return {
    ImportDeclaration: node => named(node.source),
    ExportNamedDeclaration: node => named(node.source),
    ExportAllDeclaration: node => named(node.source),
    ImportExpression: node => named(node.source),
    TSImportType: node => named(node.source),
    TSExternalModuleReference: node => named(node.expression),
    "CallExpression[callee.type='Identifier'][callee.name='require']": (node: TSESTree.CallExpression) => named(node.arguments[0]),
  }
}
