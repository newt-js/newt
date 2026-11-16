import { join } from 'node:path'

export type TemplateVersions = { newt: string, zod: string, eslint: string, bunTypes: string, react: string, reactDom: string, reactTypes: string, reactDomTypes: string }

const MANIFEST = join(import.meta.dir, '../../../package.json')

/** newt's packages go at this cli's version; the others at the ones it is tested with. */
export async function templateVersions(): Promise<TemplateVersions> {
  const { version, devDependencies } = await Bun.file(MANIFEST).json() as { version: string, devDependencies: Record<string, string> }
  return {
    newt: version,
    zod: devDependencies.zod!,
    eslint: devDependencies.eslint!,
    bunTypes: devDependencies['@types/bun']!,
    react: devDependencies.react!,
    reactDom: devDependencies['react-dom']!,
    reactTypes: devDependencies['@types/react']!,
    reactDomTypes: devDependencies['@types/react-dom']!,
  }
}
