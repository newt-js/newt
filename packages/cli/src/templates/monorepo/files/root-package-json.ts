import { lintOverrides }         from '../../backend/files/package-json'
import type { TemplateVersions } from '../../template-versions/template-versions'

const IN_EVERY_WORKSPACE = (script: string) => `bun run --filter '*' ${script}`

/** The root depends on the cli too, so `bunx newt` runs it here, and never npm's `newt`; and it holds the backends' overrides, the only ones Bun reads. */
export const rootDependencies = (versions: TemplateVersions) => ({ devDependencies: { '@newt-js/cli': versions.newt, 'typescript': versions.typescript }, overrides: lintOverrides(versions) })

export function rootPackageJson(name: string, pattern: string, versions: TemplateVersions): Record<string, unknown> {
  return {
    name,
    private: true,
    workspaces: [pattern],
    scripts: {
      dev: IN_EVERY_WORKSPACE('dev'),
      test: IN_EVERY_WORKSPACE('test'),
      typecheck: IN_EVERY_WORKSPACE('typecheck'),
      lint: IN_EVERY_WORKSPACE('lint'),
    },
    ...rootDependencies(versions),
  }
}
