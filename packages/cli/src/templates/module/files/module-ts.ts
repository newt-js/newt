import type { ModuleNames } from '../../../names/module-names/module-names'

export function moduleTs({ folder, module, type, plural }: ModuleNames): string {
  return `import { eventsOf, mapPage, Module, UseCase, type Page, type PageRequest } from '@newt-js/core'
import type { ContextBase } from '@newt-js/core/application'
import type { HttpRouter } from '@newt-js/core/http'
import { ${type}NotFound } from './errors/${folder}-not-found'
import { ${type}_Created } from './events/${folder}-created'
import { ${type} } from './${folder}'
import { ${type}_Repository, type ${type}Row } from './${folder}.repository'
import { register${type}Routes } from './${folder}.routes'
import { ${type}CreateSchema, ${type}Filter, type ${type}CreateDTO, type ${type}DTO, type ${type}FilterDTO, type ${type}SortDTO } from './${folder}.schema'

export class ${type}_Module extends Module {
  static initialize(base: ContextBase, router: HttpRouter): ${type}_Module {
    const module = new ${type}_Module(base, new ${type}_Repository(base))
    register${type}Routes(router, module)
    return module
  }

  readonly events

  private constructor(base: ContextBase, private readonly ${plural}: ${type}_Repository) {
    super('${module}', base.useCaseRunner)
    this.events = eventsOf(base.bus, { created: ${type}_Created })
  }

  @UseCase()
  async create(input: ${type}CreateDTO): Promise<${type}DTO> {
    const ${module} = ${type}.create(${type}CreateSchema.parse(input))
    await this.${plural}.persist(${module})
    return ${module}.toDTO()
  }

  @UseCase()
  async get(criteria: ${type}FilterDTO): Promise<${type}DTO> {
    const [${module}] = await this.${plural}.find(${type}Filter.toCriteria<${type}Row>(${type}Filter.schema.parse(criteria)), { limit: 1 })
    if (!${module}) {
      throw new ${type}NotFound()
    }
    return ${module}.toDTO()
  }

  @UseCase()
  async find(criteria: ${type}FilterDTO, sort?: ${type}SortDTO): Promise<${type}DTO[]> {
    const orderBy = ${type}Filter.toOrder<${type}Row>(sort === undefined ? undefined : ${type}Filter.sortSchema.parse(sort))
    const found = await this.${plural}.find(${type}Filter.toCriteria<${type}Row>(${type}Filter.schema.parse(criteria)), { orderBy })
    return found.map(each => each.toDTO())
  }

  @UseCase()
  async paginate(criteria: ${type}FilterDTO, page: PageRequest): Promise<Page<${type}DTO>> {
    const found = await this.${plural}.paginate(${type}Filter.toCriteria<${type}Row>(${type}Filter.schema.parse(criteria)), page, { newestFirst: true })
    return mapPage(found, each => each.toDTO())
  }
}
`
}
