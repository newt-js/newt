const OF_FEATURE = /^([a-z][A-Za-z0-9]*)\[[a-z][A-Za-z0-9]*\]$/

/** The feature a module is of, by its name: `campaigns` for `campaigns[template]`; `null` for one of no feature. */
export function featureOfModule(module: string): string | null {
  return OF_FEATURE.exec(module)?.[1] ?? null
}
