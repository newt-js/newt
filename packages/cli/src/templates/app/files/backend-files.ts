import type { ContextNames } from '../../../names/context-names/context-names'
import { CONTEXT_TO_RUN }    from '../../context/files/context-ts'

/** The line of <ctx>.context.ts that hands the context to run, its app given too. */
export const contextToRunWithApp = (app: string) => CONTEXT_TO_RUN.replace(/ \}$/, `, app${app === 'app' ? '' : `: ${app}`} }`)

/** The test, in src/index.test.ts, that the backend serves a context's app; a built one, once it is built. */
export function appTest({ folder, env }: ContextNames, built?: string): string {
  const name = built === undefined ? `the backend serves the app of ${folder}` : `the backend serves the app of ${folder}, once built`
  const head = built === undefined ? `test('${name}'` : `test.skipIf(!(await Bun.file(join(import.meta.dir, ${built}, 'index.html')).exists()))('${name}'`
  return `${head}, async () => {
  const backend = await startBackend(0, { data: 'memory' })
  const response = await fetch(new URL('/${folder}/any/page', backend.server!.url), { headers: { host: Bun.env.${env}_HOST ?? 'localhost' } })
  expect(response.headers.get('content-type')).toContain('text/html')
  await backend.stop()
})`
}
