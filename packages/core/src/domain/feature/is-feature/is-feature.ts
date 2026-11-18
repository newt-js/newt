export const FEATURE_BRAND: unique symbol = Symbol.for('@newt-js/core/feature')

/** What a feature's contract tells of itself: its name and its context's. */
export type FeatureIdentity = { readonly name: string, readonly context: string }

export function isFeature(value: unknown): value is { readonly [FEATURE_BRAND]: FeatureIdentity } {
  return typeof value === 'object' && value !== null && typeof (value as { [FEATURE_BRAND]?: unknown })[FEATURE_BRAND] === 'object'
}

/** The name and the context of a feature's contract. */
export function featureOf(value: { readonly [FEATURE_BRAND]: FeatureIdentity }): FeatureIdentity {
  return value[FEATURE_BRAND]
}
