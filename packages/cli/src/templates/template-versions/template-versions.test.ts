import { expect }             from 'bun:test'
import { test }               from 'bun:test'
// --------------------------------------------------------
import { version }            from '../../version/version'
import { PROJECT_TYPESCRIPT } from './template-versions'
import { templateVersions }   from './template-versions'

test("newt's packages at the cli's version, the others at the cli's own", async () => {
  const { dependencies, devDependencies } = await Bun.file(new URL('../../../package.json', import.meta.url)).json() as { dependencies: Record<string, string>, devDependencies: Record<string, string> }
  expect(await templateVersions()).toEqual({
    newt: `^${await version()}`,
    zod: devDependencies.zod!,
    eslint: devDependencies.eslint!,
    bunTypes: devDependencies['@types/bun']!,
    react: devDependencies.react!,
    reactDom: devDependencies['react-dom']!,
    reactTypes: devDependencies['@types/react']!,
    reactDomTypes: devDependencies['@types/react-dom']!,
    bunPluginTailwind: devDependencies['bun-plugin-tailwind']!,
    lintTypescript: dependencies.typescript!,
    typescript: PROJECT_TYPESCRIPT,
  })
})

test("a project's TypeScript is the one newt's repo is on", async () => {
  const { devDependencies } = await Bun.file(new URL('../../../../../package.json', import.meta.url)).json() as { devDependencies: Record<string, string> }
  expect(PROJECT_TYPESCRIPT).toBe(devDependencies.typescript!)
})
