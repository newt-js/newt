import type { ModuleNames } from '../../../names/module-names/module-names'

/** The lines of a module that change when it starts to take deps: without them, and with them. */
export function moduleLines({ module, type, plural }: ModuleNames, withDeps: boolean) {
  const deps = (text: string) => withDeps ? text : ''
  return {
    initialize: `  static initialize(base: ContextBase, router: HttpRouter${deps(`, deps: ${type}_Deps`)}): ${type}_Module {`,
    created: `    const module = new ${type}_Module(base, new ${type}_Repository(base)${deps(', deps')})`,
    constructor: `  private constructor(base: ContextBase, private readonly ${plural}: ${type}_Repository${deps(`, private readonly deps: ${type}_Deps`)}) {`,
    super: `    super('${module}', base.useCaseRunner${deps(', deps')})`,
  }
}
