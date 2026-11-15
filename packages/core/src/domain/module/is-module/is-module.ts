export const MODULE_BRAND: unique symbol = Symbol.for('@newt-js/core/module')

export type BrandedModule = { readonly name: string, readonly useCaseRunner: { readonly registry: { readonly context: string } } }

export function isModule(value: unknown): value is BrandedModule {
  return typeof value === 'object' && value !== null && (value as { [MODULE_BRAND]?: unknown })[MODULE_BRAND] === true
}
