import type { ModuleNames } from '../../../names/module-names/module-names'
import { moduleLines }      from '../module-lines/module-lines'

export function moduleTs(names: ModuleNames): string {
  const { folder, module, type } = names
  const lines = moduleLines(names, false)
  return `import { eventsOf, mapPage, Module, UseCase, type Page, type PageRequest } from '@newt-js/core'
import type { ContextBase } from '@newt-js/core/application'
import type { HttpRouter } from '@newt-js/core/http'
import { ${type}NotFound } from './errors/${folder}-not-found'
import { ${type}_Created } from './events/${folder}-created'
import { ${type} } from './${folder}'
import { ${type}_Repository } from './${folder}.repository'
import { register${type}Routes } from './${folder}.routes'
import { ${type}CreateSchema, ${type}Filter, type ${type}CreateDTO, type ${type}DTO, type ${type}FilterDTO, type ${type}SortDTO } from './${folder}.schema'
import { ${type}Id } from './value-objects/${folder}-id'

export class ${type}_Module extends Module {
${lines.initialize}
${lines.created}
    return module
  }

  readonly events
  readonly routes

${lines.constructor}
${lines.super}
    this.events = eventsOf(base.bus, {
      created: ${type}_Created,
    })
${lines.routes}
  }

  @UseCase()
  async create(input: ${type}CreateDTO): Promise<${type}DTO> {
    const ${module} = ${type}.create(${type}CreateSchema.parse(input))
    await this.repository.persist(${module})
    return ${module}.toDTO()
  }

  @UseCase()
  async get(id: string): Promise<${type}DTO> {
    const [${module}] = await this.repository.find(
      { id: ${type}Id.from(id) },
      { limit: 1 },
    )
    if (!${module}) {
      throw new ${type}NotFound()
    }
    return ${module}.toDTO()
  }

  @UseCase()
  async find(
    criteria: ${type}FilterDTO,
    sort?: ${type}SortDTO,
  ): Promise<${type}DTO[]> {
    const found = await this.repository.find(
      ${type}Filter.toCriteria(criteria),
      { orderBy: ${type}Filter.toOrder(sort) },
    )
    return found.map(each => each.toDTO())
  }

  @UseCase()
  async paginate(
    criteria: ${type}FilterDTO,
    page: PageRequest,
  ): Promise<Page<${type}DTO>> {
    const found = await this.repository.paginate(
      ${type}Filter.toCriteria(criteria),
      page,
      { newestFirst: true },
    )
    return mapPage(found, each => each.toDTO())
  }
}
`
}
