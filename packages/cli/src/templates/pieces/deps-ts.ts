import type { ModuleNames } from '../../names/module-names/module-names'

export const depsHead = ({ type }: ModuleNames) => `export type ${type}_Deps = {`

export function depsTs(module: ModuleNames): string {
  return `${depsHead(module)}\n}\n`
}
