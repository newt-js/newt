import { expect }           from 'bun:test'
import { test }             from 'bun:test'
// --------------------------------------------------------
import { version }          from '../../version/version'
import { templateVersions } from './template-versions'

test("newt's packages at the cli's version, the others at the cli's own", async () => {
  const { devDependencies } = await Bun.file(new URL('../../../package.json', import.meta.url)).json() as { devDependencies: Record<string, string> }
  expect(await templateVersions()).toEqual({
    newt: await version(),
    zod: devDependencies.zod!,
    eslint: devDependencies.eslint!,
    bunTypes: devDependencies['@types/bun']!,
    react: devDependencies.react!,
    reactDom: devDependencies['react-dom']!,
    reactTypes: devDependencies['@types/react']!,
    reactDomTypes: devDependencies['@types/react-dom']!,
  })
})
