import { default as parser } from '@typescript-eslint/parser'
// --------------------------------------------------------
import { importsAndExports } from './packages/lint/src/rules/imports-and-exports/imports-and-exports'
import { layers }            from './tools/lint/layers'

// The framework's own lint: the style of this repository, not of the applications built with newt.
export default [
  // shadcn's components are kept as shadcn writes them: not in this repository's style.
  { ignores: ['**/node_modules/**', 'packages/react/src/shadcn/**'] },
  {
    files: ['**/*.ts'],
    languageOptions: { parser },
    plugins: { repo: { rules: { 'imports-and-exports': importsAndExports, layers } } },
    rules: { 'repo/imports-and-exports': 'error', 'repo/layers': 'error' },
  },
]
