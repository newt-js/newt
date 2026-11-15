import { TSESLint }            from '@typescript-eslint/utils'
import { afterAll }            from 'bun:test'
import { describe }            from 'bun:test'
import { it }                  from 'bun:test'
import { Rule }                from 'eslint'
import { RuleTester }          from 'eslint'
import { default as ts }       from 'typescript'
import { default as tseslint } from 'typescript-eslint'

RuleTester.describe = describe
RuleTester.it = it
RuleTester.itOnly = it.only
// ESLint's RuleTester takes the runner's afterAll too, though its types list only describe and it.
;(RuleTester as unknown as { afterAll: typeof afterAll }).afterAll = afterAll

/** A rule as ESLint's RuleTester takes it: typescript-eslint's types of a rule are not ESLint's, though ESLint runs it. */
export const asRule = (rule: TSESLint.RuleModule<string, readonly unknown[]>) => rule as unknown as Rule.RuleModule

/** A tester that reads TypeScript, with no program: the rules by what is written. */
export const tester = new RuleTester({ languageOptions: { parser: tseslint.parser } })

/** A tester that reads TypeScript with `program`: the rules by what TypeScript says too. */
export const typedTester = (program: ts.Program) => new RuleTester({ languageOptions: { parser: tseslint.parser, parserOptions: { programs: [program] } } })

/** A program of `files` (path to code) and what they import, as the preset has typescript-eslint build one. */
export function programOf(files: Record<string, string>): ts.Program {
  const options: ts.CompilerOptions = { strict: true, target: ts.ScriptTarget.ES2022, noEmit: true }
  const host = ts.createCompilerHost(options)
  const read = host.getSourceFile.bind(host)
  host.getSourceFile = (name, ...rest) => (name in files ? ts.createSourceFile(name, files[name]!, ts.ScriptTarget.ES2022, true) : read(name, ...rest))
  host.fileExists = name => name in files || ts.sys.fileExists(name)
  host.readFile = name => files[name] ?? ts.sys.readFile(name)
  host.directoryExists = folder => Object.keys(files).some(file => file.startsWith(`${folder}/`)) || (ts.sys.directoryExists?.(folder) ?? false)
  return ts.createProgram(Object.keys(files), options, host)
}

/** What a program says is wrong with its own files: none, for one a test types its rules with. */
export function diagnosticsOf(program: ts.Program): string[] {
  return ts.getPreEmitDiagnostics(program).map(each => ts.flattenDiagnosticMessageText(each.messageText, '\n'))
}

/** Where the tests put a module of their own: price-change, in the context ws. */
export const MODULE = '/repo/src/contexts/ws/modules/price-change'

/** Where the tests put an order's module, in the context shop. */
export const ORDER = '/repo/src/contexts/shop/modules/order'
