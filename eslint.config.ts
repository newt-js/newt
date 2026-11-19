import { default as parser } from '@typescript-eslint/parser'
// --------------------------------------------------------
import { importsAndExports } from './packages/lint/src/rules/imports-and-exports/imports-and-exports'
import { layers }            from './tools/lint/layers'

// The framework's own lint: the style of this repository, not of the applications built with newt.
export default [
  { ignores: ['**/node_modules/**'] },
  {
    files: ['**/*.ts'],
    languageOptions: { parser },
    plugins: { repo: { rules: { 'imports-and-exports': importsAndExports, layers } } },
    rules: { 'repo/imports-and-exports': 'error', 'repo/layers': 'error' },
  },
]
