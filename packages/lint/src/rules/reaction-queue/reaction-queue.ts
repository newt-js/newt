import type { ParserServicesWithTypeInformation } from '@typescript-eslint/utils'
import { TSESLint }                               from '@typescript-eslint/utils'
import { TSESTree }                               from '@typescript-eslint/utils'
import { posix }                                  from 'node:path'
import { default as ts }                          from 'typescript'
// --------------------------------------------------------
import { nodes }                                  from '../../ast/ast'
import { textOf }                                 from '../../ast/ast'
import { unwrap }                                 from '../../ast/ast'
import { camelCase }                              from '../../paths/paths'
import { modulePlace }                            from '../../paths/paths'
import { pascalCase }                             from '../../paths/paths'
import { rootOf }                                 from '../../paths/paths'

/**
 * `<feature>[<module>].<use case>_on_<module>.<event>`: newt refuses at startup a handler's
 * queue of any other shape; the event is the name of the one it subscribes to, a module's
 * and its own. Stricter than newt's own `eventOfQueue`: reaction-queue.test.ts holds every
 * queue this takes to be one newt takes.
 */
export const FEATURE_QUEUE = /^([a-z][A-Za-z0-9]*\[[a-z][A-Za-z0-9]*\])\.([a-z][A-Za-z0-9]*)_on_([^.\s]+\.([^.\s]+))$/

/** How a queue is written, and one written so, for the message of one that is not. */
const SHAPE = '<feature>[<module>].<use case>_on_<event>'
const EXAMPLE = 'shipping[delivery].prepare_on_sales[order].placed'

/** The property of an object written with a name, `queue: …` or `'queue': …`. */
function property(object: TSESTree.ObjectExpression, name: string): TSESTree.Property | undefined {
  return object.properties.find((each): each is TSESTree.Property => each.type === 'Property' && !each.computed
    && ((each.key.type === 'Identifier' && each.key.name === name) || (each.key.type === 'Literal' && each.key.value === name)))
}

function variableOf(scope: TSESLint.Scope.Scope, name: string): TSESLint.Scope.Variable | null {
  for (let each: TSESLint.Scope.Scope | null = scope; each; each = each.upper) {
    const found = each.set.get(name)
    if (found) return found
  }
  return null
}

/** What TypeScript says, from the program typescript-eslint builds, of the module whose class is `type` and of the events a handler subscribes to. */
function typesOf(checker: ts.TypeChecker, map: ParserServicesWithTypeInformation['esTreeNodeToTSNodeMap'], type: string) {
  const literal = (found: ts.Type | undefined) => found?.isStringLiteral() ? found.value : undefined

  /** The name a schedule is defined with (`base.schedules.define('order.nightly', '0 3 * * *')`). */
  const scheduled = (value: ts.Node) => {
    if (!ts.isCallExpression(value) || value.arguments.length === 0) return undefined
    const callee = value.expression
    if (!ts.isPropertyAccessExpression(callee) || callee.name.text !== 'define') return undefined
    return literal(checker.getTypeAtLocation(value.arguments[0]!))
  }

  /** What is assigned to `symbol` under `node` (`this.nightly = …` in a constructor). */
  const assigned = (node: ts.Node | undefined, symbol: ts.Symbol) => {
    const found: ts.Node[] = []
    const visit = (each: ts.Node) => {
      if (ts.isBinaryExpression(each) && each.operatorToken.kind === ts.SyntaxKind.EqualsToken) {
        const left = ts.isPropertyAccessExpression(each.left) ? each.left.name : each.left
        if (checker.getSymbolAtLocation(left) === symbol) found.push(each.right)
      }
      each.forEachChild(visit)
    }
    node?.forEachChild(visit)
    return found
  }

  return {
    /** Whether `object` is of the module's class; an object TypeScript knows no type of (`any`) is not judged, and counts. */
    typed(object: TSESTree.Node): boolean {
      const found = checker.getTypeAtLocation(map.get(object))
      if (['any', 'unknown'].includes(checker.typeToString(found))) return true
      return (found.getSymbol() ?? found.aliasSymbol)?.getName() === type
    },

    /** The name of the event an emitter tells: the `eventName` of its event class, or the name of a schedule. */
    eventName(emitter: TSESTree.Node): string | undefined {
      const node = map.get(emitter)
      const symbol = checker.getSymbolAtLocation(ts.isPropertyAccessExpression(node) ? node.name : node)
      if (!symbol) return undefined
      for (const declaration of symbol.declarations ?? []) {
        const initializer = ts.isPropertyDeclaration(declaration) || ts.isVariableDeclaration(declaration) || ts.isPropertyAssignment(declaration) ? declaration.initializer : undefined
        for (const value of [initializer, ...assigned(declaration.parent, symbol)]) {
          if (!value) continue
          const eventName = checker.getTypeAtLocation(value).getProperty('eventName')
          const name = literal(eventName && checker.getTypeOfSymbol(eventName)) ?? scheduled(value)
          if (name) return name
        }
      }
      return undefined
    },
  }
}

/**
 * A handler's queue says who reacts with what to which event:
 * `<feature>[<module>].<use case>_on_<event>`, the event by its whole name. Written by hand, it could say another
 * module's or another use case's: in every file of a module, this checks it has that
 * shape, that it is the module's, that its callback calls that use case on the module
 * itself, and that it ends with the event it subscribes to. A reaction written with
 * `Module.on` (`orders.on(event, 'fulfil', …)`) derives its queue from the module it is
 * called on: in a module's files, that is the module itself.
 */
export const reactionQueue: TSESLint.RuleModule<'shape' | 'module' | 'useCase' | 'event' | 'on'> = {
  defaultOptions: [],
  meta: {
    type: 'problem',
    docs: { description: "A reaction's queue names the module that reacts, the use case it calls and the event." },
    messages: {
      shape: "'{{queue}}' is not a handler's queue: it is '{{shape}}', the event by its whole name, as '{{example}}'. Better yet, write the reaction with `<module>.on(event, '<use case>', args)`, which names it.",
      module: "This queue is '{{module}}.…': the reactions in {{file}} are {{module}}'s, so their queues start with '{{module}}.', not '{{found}}.'.",
      useCase: "This queue says the handler calls {{module}}'s '{{useCase}}', but its callback calls no '{{useCase}}' of {{module}}: name the use case it calls.",
      event: "This queue ends with '{{on}}{{event}}', the event it subscribes to.",
      on: "In {{file}}, `on` is called on {{module}}'s module: a reaction calls a use case of the module whose files it is in. Move it to the files of the module it calls.",
    },
    schema: [],
  },
  create(context) {
    const place = modulePlace(context.filename, rootOf(context))
    if (!place) return {}
    const own = camelCase(place.module)
    const module = `${camelCase(place.feature)}[${own}]`
    const type = `${pascalCase(place.module)}_Module`
    const file = posix.basename(place.inside)

    /** The names a module goes by without a program to tell its type: its own, and its English plurals. */
    const names = new Set([own, `${own}s`])
    if (/[^aeiou]y$/.test(own)) names.add(`${own.slice(0, -1)}ies`)
    if (/(s|x|z|ch|sh)$/.test(own)) names.add(`${own}es`)

    const services = context.sourceCode.parserServices as Partial<ParserServicesWithTypeInformation> | undefined
    const checker = services?.program?.getTypeChecker()
    const types = checker && services?.esTreeNodeToTSNodeMap ? typesOf(checker, services.esTreeNodeToTSNodeMap, type) : undefined

    /** The class `this` is at `node`, through arrow functions; `null` in a function of its own. */
    const classOf = (node: TSESTree.Node) => {
      for (let around = node.parent; around; around = around.parent) {
        if (around.type === 'ClassBody') return around.parent
        if (around.type === 'FunctionDeclaration' || (around.type === 'FunctionExpression' && around.parent.type !== 'MethodDefinition')) return null
      }
      return null
    }

    /** That a type annotation names the module's type, also qualified (`m.Order_Module`). */
    const isType = (annotation: TSESTree.TypeNode) => {
      const name = annotation.type === 'TSTypeReference' ? annotation.typeName : null
      return (name?.type === 'Identifier' ? name.name : name?.type === 'TSQualifiedName' ? name.right.name : null) === type
    }

    /** The type `this.<field>` is given in the class around `node`: a property's, or a constructor parameter's. */
    const fieldType = (node: TSESTree.Node, field: string) => {
      let around = node.parent
      while (around && around.type !== 'ClassBody') around = around.parent
      for (const member of around?.type === 'ClassBody' ? around.body : []) {
        if (member.type === 'PropertyDefinition' && member.key.type === 'Identifier' && member.key.name === field) return member.typeAnnotation?.typeAnnotation
        if (member.type !== 'MethodDefinition' || member.kind !== 'constructor') continue
        for (const param of member.value.params) {
          if (param.type === 'TSParameterProperty' && param.parameter.type === 'Identifier' && param.parameter.name === field) return param.parameter.typeAnnotation?.typeAnnotation
        }
      }
      return undefined
    }

    /**
     * That `object` is the module: of its type, by what TypeScript says, with a program;
     * without one, `this` in its own file or in a class of its name, or by its
     * annotation, or by its name when it has none (`orders`, `this.orders`).
     */
    const isModule = (object: TSESTree.Node): boolean => {
      const byType = types?.typed(object)
      if (byType !== undefined) return byType
      if (object.type === 'ThisExpression') return place.inside.endsWith('.module.ts') || classOf(object)?.id?.name === type
      if (object.type === 'MemberExpression') {
        if (object.computed || object.property.type !== 'Identifier') return false
        const annotation = object.object.type === 'ThisExpression' ? fieldType(object, object.property.name) : undefined
        return annotation ? isType(annotation) : names.has(object.property.name)
      }
      if (object.type !== 'Identifier') return false
      const defined = variableOf(context.sourceCode.getScope(object), object.name)?.defs[0]?.name
      const annotation = defined && 'typeAnnotation' in defined ? defined.typeAnnotation?.typeAnnotation : undefined
      return annotation ? isType(annotation) : names.has(object.name)
    }

    /** What the callback runs: its body when written there or a function declared in the file, else `null`, and nothing is guessed. */
    const bodyOf = (callback: TSESTree.CallExpressionArgument | undefined) => {
      if (callback?.type === 'ArrowFunctionExpression' || callback?.type === 'FunctionExpression') return callback.body
      if (callback?.type !== 'Identifier') return null
      const definition = variableOf(context.sourceCode.getScope(callback), callback.name)?.defs[0]?.node
      return definition?.type === 'FunctionDeclaration' ? definition.body : null
    }

    return {
      CallExpression(node) {
        const { callee, arguments: [callback, options] } = node
        if (callee.type !== 'MemberExpression' || callee.computed || callee.property.type !== 'Identifier') return
        // `<module>.on(event, '<use case>', …)`: its second argument names the use case, as a string.
        if (callee.property.name === 'on' && node.arguments.length >= 2 && textOf(node.arguments[1]) !== undefined && textOf(node.arguments[0]) === undefined) {
          if (!isModule(callee.object)) context.report({ node: callee.object, messageId: 'on', data: { module, file } })
          return
        }
        if (callee.property.name !== 'subscribe' || options?.type !== 'ObjectExpression') return
        const queue = unwrap(property(options, 'queue')?.value)
        const name = textOf(queue)
        if (textOf(property(options, 'strategy')?.value) !== 'handler' || queue === undefined || name === undefined) return
        const shape = FEATURE_QUEUE.exec(name)
        if (!shape) {
          context.report({ node: queue, messageId: 'shape', data: { queue: name, shape: SHAPE, example: EXAMPLE } })
          return
        }
        const [, found = '', useCase = '', event = '', last = ''] = shape
        if (found !== module) context.report({ node: queue, messageId: 'module', data: { module, found, file } })
        const runs = bodyOf(callback)
        const calls = runs && [...nodes(runs)].some(each => each.type === 'CallExpression' && each.callee.type === 'MemberExpression'
          && !each.callee.computed && each.callee.property.type === 'Identifier' && each.callee.property.name === useCase && isModule(each.callee.object))
        if (runs && !calls) context.report({ node: queue, messageId: 'useCase', data: { useCase, module } })
        if (types) {
          const told = types.eventName(callee.object)
          if (told && event !== told) context.report({ node: queue, messageId: 'event', data: { on: '_on_', event: told } })
          return
        }
        // Without a program, only the key it is read from in `events` (`eventsOf`'s) says the event.
        const emitter = callee.object
        const key = emitter.type === 'MemberExpression' && !emitter.computed && emitter.property.type === 'Identifier'
          && emitter.object.type === 'MemberExpression' && !emitter.object.computed && emitter.object.property.type === 'Identifier'
          && emitter.object.property.name === 'events' ? emitter.property.name : null
        if (key && last !== key) context.report({ node: queue, messageId: 'event', data: { on: '_on_', event: `….${key}` } })
      },
    }
  },
}
