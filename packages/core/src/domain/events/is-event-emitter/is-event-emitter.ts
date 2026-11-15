export const EVENT_EMITTER_BRAND: unique symbol = Symbol.for('@newt-js/core/event-emitter')

export type BrandedEventEmitter = { readonly name: string }

export function isEventEmitter(value: unknown): value is BrandedEventEmitter {
  return typeof value === 'object' && value !== null && (value as { [EVENT_EMITTER_BRAND]?: unknown })[EVENT_EMITTER_BRAND] === true
}
