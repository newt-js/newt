import { join }          from 'node:path'
// --------------------------------------------------------
import { useCaseNames }  from '../../names/use-case-names/use-case-names'
import { classMembers }  from '../../project/class-members/class-members'
import { findModule }    from '../../project/find-module/find-module'
import { indexTypeLine } from '../../templates/module/files/index-ts'
import { useCaseMember } from '../../templates/pieces/use-case-ts'
import { useCaseSchema } from '../../templates/pieces/use-case-ts'
import { useCaseTest }   from '../../templates/pieces/use-case-ts'
import { defineCommand } from '../command'
import { CommandError }  from '../command-error/command-error'

const USAGE = 'newt add use-case takes the module and the use case, as in newt add use-case sales/order mark-paid'

const READS = ['find', 'get', 'paginate', 'search']

export const ADD_USE_CASE = defineCommand({
  name: 'add use-case',
  summary: 'Adds a use case to a module: the method, its schema and its test',
  args: '<context>/<module> <use-case>',
  options: {
    backend: { type: 'string', value: 'folder', description: 'The backend, in a monorepo with several' },
  },
  run: async ({ args, cwd, options }) => {
    const [given, name, ...rest] = args
    if (name === undefined || rest.length > 0) throw new CommandError(USAGE)
    const { folder, module } = await findModule(given, cwd, options.backend, USAGE)
    const useCase = useCaseNames(name)
    if (READS.includes(useCase.camel)) {
      throw new CommandError(`${useCase.camel} is one of the reads newt's lint shapes (${READS.join(', ')}): name a use case by what it does`)
    }
    const file = (suffix: string) => join(folder, `${module.folder}${suffix}`)
    const code = await Bun.file(join(cwd, file('.module.ts'))).text().catch(() => '')
    const schema = (await Bun.file(join(cwd, file('.schema.ts'))).text().catch(() => '')).replaceAll('\r\n', '\n')
    const again = schema.includes(useCaseSchema(module, useCase))
    if (!again) {
      if (classMembers(code, `${module.type}_Module`).includes(useCase.camel)) {
        throw new CommandError(`${module.type}_Module has ${useCase.camel} already: name the use case by what else it does`)
      }
      const taken = [`${module.type}${useCase.type}Schema`, `${module.type}${useCase.type}DTO`].find(each => new RegExp(`\\b${each}\\b`).test(schema))
      if (taken) {
        throw new CommandError(`'${name}' cannot name a use case: ${module.folder}.schema.ts has ${taken} already; name it by what it does`)
      }
    }
    return {
      changes: [
        { action: 'append-block', path: file('.schema.ts'), block: useCaseSchema(module, useCase), imports: [] },
        {
          action: 'add-class-member',
          path: file('.module.ts'),
          className: `${module.type}_Module`,
          name: useCase.camel,
          member: useCaseMember(module, useCase),
          imports: [`import { ${module.type}${useCase.type}Schema, type ${module.type}${useCase.type}DTO } from './${module.folder}.schema'`],
        },
        { action: 'append-block', path: file('.module.test.ts'), block: useCaseTest(module, useCase), imports: [] },
        // Who calls the use case writes its input: its index.ts offers its DTO.
        { action: 'ensure-lines', path: join(folder, 'index.ts'), lines: [indexTypeLine(`${module.type}${useCase.type}DTO`, module.folder)] },
      ],
      nextSteps: [
        `change the ${module.words} by a method of its entity, in ${module.folder}.ts, and call it before persist in ${useCase.camel}`,
        `bun test ${folder}`,
      ],
    }
  },
})
