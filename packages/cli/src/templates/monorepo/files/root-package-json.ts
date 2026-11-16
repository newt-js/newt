const IN_EVERY_WORKSPACE = (script: string) => `bun run --filter '*' ${script}`

export function rootPackageJson(name: string, pattern: string): Record<string, unknown> {
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
  }
}
