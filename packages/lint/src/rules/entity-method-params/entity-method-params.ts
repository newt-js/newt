import { TSESLint }    from '@typescript-eslint/utils'
import { TSESTree }    from '@typescript-eslint/utils'
// --------------------------------------------------------
import { nodes }       from '../../ast/ast'
import { parameterOf } from '../../ast/ast'
import { modulePlace } from '../../paths/paths'
import { pascalCase }  from '../../paths/paths'
import { rootOf }      from '../../paths/paths'

/** The name of the type a reference names (`Pick` for `Pick<…>`, `OrderDTO` for `m.OrderDTO`). */
function referenced(node: TSESTree.Node): string | undefined {
  if (node.type !== 'TSTypeReference') return undefined
  const name = node.typeName
  if (name.type === 'Identifier') return name.name
  return name.type === 'TSQualifiedName' ? name.right.name : undefined
}

/**
 * An entity takes its own words: in a module's `<m>.ts`, no method of its class takes a
 * DTO (a type whose name ends with `DTO`), the contract of the use cases, nor an object
 * written in place: it takes a `<M><Verb>Props` of its own, declared beside it, even when
 * it says what a DTO says. Its constructor and `fromDTO`, which read it back from its
 * row, are the exceptions.
 */
export const entityMethodParams: TSESLint.RuleModule<'dto' | 'inline'> = {
  defaultOptions: [],
  meta: {
    type: 'problem',
    docs: { description: 'An entity takes its own Props, never a DTO.' },
    messages: {
      dto: "'{{method}}' of {{entity}} takes '{{name}}', a DTO: an entity takes its own words. Declare `export type {{props}} = …` beside it, even when it says the same, and take that.",
      inline: "'{{method}}' of {{entity}} takes an object written in place: name it, `export type {{props}} = …`, beside the entity.",
    },
    schema: [],
  },
  create(context) {
    const place = modulePlace(context.filename, rootOf(context))
    if (!place || place.inside !== `${place.module}.ts`) return {}
    const entity = pascalCase(place.module)
    return {
      'ClassBody > MethodDefinition'(member: TSESTree.MethodDefinition) {
        if (member.kind !== 'method' || member.accessibility === 'private' || member.key.type !== 'Identifier' || member.key.name === 'fromDTO') return
        const method = member.key.name
        const props = `${entity}${pascalCase(method)}Props`
        for (const parameter of member.value.params) {
          const { node, type } = parameterOf(parameter)
          if (!type) continue
          if (type.type === 'TSTypeLiteral') {
            context.report({ node, messageId: 'inline', data: { method, entity, props } })
            continue
          }
          const dto = [...nodes(type)].map(referenced).find(name => name?.endsWith('DTO'))
          if (dto) context.report({ node, messageId: 'dto', data: { method, entity, name: dto, props } })
        }
      },
    }
  },
}
