import type { ModuleNames } from '../../../names/module-names/module-names'

/** What a module offers the others, name by name: the type of its module, its DTOs and its errors. */
export function indexTs({ folder, type }: ModuleNames): string {
  return `export type { ${type}_Module } from './${folder}.module'
export type { ${type}CreateDTO, ${type}DTO, ${type}FilterDTO, ${type}SortDTO } from './${folder}.schema'
export { ${type}NotFound } from './errors/${folder}-not-found'
`
}

/** The line of a module's index.ts that offers one of its errors. */
export function indexErrorLine(errorType: string, errorFolder: string): string {
  return `export { ${errorType} } from './errors/${errorFolder}'`
}

/** The line of a module's index.ts that offers one of its DTOs. */
export function indexTypeLine(dto: string, folder: string): string {
  return `export type { ${dto} } from './${folder}.schema'`
}
