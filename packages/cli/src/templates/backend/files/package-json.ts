import type { TemplateVersions } from '../../template-versions/template-versions'

/** What loads TypeScript for the lint: its parser stack needs TypeScript 6's API, whatever TypeScript the project uses. */
const LINT_TYPESCRIPT_USERS = [
  'typescript-eslint',
  '@typescript-eslint/eslint-plugin',
  '@typescript-eslint/parser',
  '@typescript-eslint/project-service',
  '@typescript-eslint/tsconfig-utils',
  '@typescript-eslint/type-utils',
  '@typescript-eslint/typescript-estree',
  '@typescript-eslint/utils',
  'ts-api-utils',
]

export function packageJson(name: string, versions: TemplateVersions): Record<string, unknown> {
  return {
    name,
    private: true,
    type: 'module',
    scripts: {
      dev: 'bun --watch src/index.ts',
      start: 'bun src/index.ts',
      test: 'bun test',
      typecheck: 'bun check -b',
      lint: 'bun --bun eslint',
    },
    dependencies: {
      '@newt-js/core': versions.newt,
      'zod': versions.zod,
    },
    devDependencies: {
      '@newt-js/cli': versions.newt,
      '@newt-js/lint': versions.newt,
      '@types/bun': versions.bunTypes,
      'eslint': versions.eslint,
    },
    overrides: Object.fromEntries(LINT_TYPESCRIPT_USERS.map(name => [name, { typescript: versions.lintTypescript }])),
  }
}
