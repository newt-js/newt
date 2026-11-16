import type { TemplateVersions } from '../../template-versions/template-versions'

export function packageJson(name: string, versions: TemplateVersions): string {
  return `${JSON.stringify({
    name,
    private: true,
    type: 'module',
    scripts: {
      dev: 'bun --watch src/index.ts',
      start: 'bun src/index.ts',
      test: 'bun test',
      typecheck: 'bun check',
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
  }, null, 2)}\n`
}
