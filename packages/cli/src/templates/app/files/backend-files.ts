import type { ContextNames } from '../../../names/context-names/context-names'
import { CONTEXT_TO_RUN }    from '../../context/files/context-ts'

/** The line of <ctx>.context.ts that hands the context to run, its app given too. */
export function contextToRunWithApp(app: string): string {
  const given = app === 'app' ? 'app' : `app: ${app}`
  const line = CONTEXT_TO_RUN.replace(/ \}$/, `, ${given} }`)
  const fits = `    ${line}`.length <= 80
  return fits ? line : `return {\n      context,\n      router,\n      host,\n      ${given},\n    }`
}

/** The test, in src/index.test.ts, that the backend serves a context's app; a built one, once it is built. */
export function appTest({ folder, camel, env }: ContextNames, built?: string): string {
  const isBuilt = `${camel}Built`
  const head = built === undefined
    ? `test('the backend serves the app of ${folder}'`
    : `const ${camel}App = join(import.meta.dir, ${built}, 'index.html')
const ${isBuilt} = await Bun.file(${camel}App).exists()

test.skipIf(!${isBuilt})('serves the built app of ${folder}'`
  return `${head}, async () => {
  const backend = await startBackend(0, { data: 'memory' })
  const url = new URL('/${folder}/any/page', backend.server!.url)
  const host = Bun.env.${env}_HOST ?? 'localhost'
  const response = await fetch(url, { headers: { host } })
  expect(response.headers.get('content-type')).toContain('text/html')
  await backend.stop()
})`
}
