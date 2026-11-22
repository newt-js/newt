import { join } from 'node:path'

export type TemplateVersions = { newt: string, zod: string, eslint: string, bunTypes: string, react: string, reactDom: string, reactTypes: string, reactDomTypes: string, bunPluginTailwind: string, reactRouter: string, lintTypescript: string, typescript: string }

const MANIFEST = join(import.meta.dir, '../../../package.json')

/** The TypeScript a project uses, its editor and \`bunx tsc\` too: newt's repo is on it. Its lint takes its own 6. */
export const PROJECT_TYPESCRIPT = '7.0.2'

/** newt's packages with `^` on this cli's version: while newt is 0.x, the patches of its minor. The others at the ones it is tested with. */
export async function templateVersions(): Promise<TemplateVersions> {
  const { version, dependencies, devDependencies } = await Bun.file(MANIFEST).json() as { version: string, dependencies: Record<string, string>, devDependencies: Record<string, string> }
  return {
    newt: `^${version}`,
    zod: devDependencies.zod!,
    eslint: devDependencies.eslint!,
    bunTypes: devDependencies['@types/bun']!,
    react: devDependencies.react!,
    reactDom: devDependencies['react-dom']!,
    reactTypes: devDependencies['@types/react']!,
    reactDomTypes: devDependencies['@types/react-dom']!,
    bunPluginTailwind: devDependencies['bun-plugin-tailwind']!,
    reactRouter: devDependencies['react-router']!,
    lintTypescript: dependencies.typescript!,
    typescript: PROJECT_TYPESCRIPT,
  }
}
