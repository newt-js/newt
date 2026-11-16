import type { ModuleNames } from '../../names/module-names/module-names'
import type { PieceNames }  from '../../names/piece-names/piece-names'

export type RouteShape = { method: string, path: string, takesInput: boolean, returnsNothing: boolean }

/** A route that calls a use case: with the id of its path, or its body as it came, and answers what it tells. */
export function routeLine({ type, plural }: ModuleNames, useCase: PieceNames, { method, path, takesInput, returnsNothing }: RouteShape): string {
  const input = !takesInput ? '' : path.includes(':id') ? `{ id: ${type}Id.from(request.params.id) }` : 'await bodyOf(request)'
  const call = `await ${plural}.${useCase.camel}(${input})`
  const answer = returnsNothing ? `{\n    ${call}\n    return new Response(null, { status: 204 })\n  }` : `Response.json(${call})`
  const uses = input === '' ? '()' : 'request'
  return `  router.${method}('${path}', async ${uses} => ${answer})`
}

/** A test that calls the route, on a new entity when its path takes an id. */
export function routeTest({ plural }: ModuleNames, useCase: PieceNames, { method, path, returnsNothing }: RouteShape): string {
  const url = path.replace(':id', '${created.id}')
  return `test('${method.toUpperCase()} ${path} calls ${useCase.camel}', async () => {
  const created = await ${plural}.create({ name: 'First' })

  const response = await router.answer(new Request(\`http://backend.test/api${url}\`, { method: '${method.toUpperCase()}' }))
  expect(response?.status).toBe(${returnsNothing ? 204 : 200})
})`
}
