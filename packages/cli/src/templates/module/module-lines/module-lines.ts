import type { ModuleNames } from '../../../names/module-names/module-names'

/** The lines of a module that change when it starts to take deps: without them, and with them. */
export function moduleLines({ name, type, plural }: ModuleNames, withDeps: boolean) {
  const deps = (text: string) => withDeps ? text : ''
  return {
    initialize: `  static initialize(\n    base: ContextBase,\n    router: HttpRouter,\n${deps(`    deps: ${type}_Deps,\n`)}  ): ${type}_Module {`,
    created: `    const ${plural} = new ${type}_Repository(base)\n    const module = new ${type}_Module(base, ${plural}, router${deps(', deps')})`,
    constructor: `  private constructor(\n    base: ContextBase,\n    private readonly ${plural}: ${type}_Repository,\n    router: HttpRouter,\n${deps(`    private readonly deps: ${type}_Deps,\n`)}  ) {`,
    super: `    super('${name}', base.useCaseRunner${deps(', deps')})`,
    routes: `    this.routes = register${type}Routes(router, this${deps(', deps')})`,
  }
}
