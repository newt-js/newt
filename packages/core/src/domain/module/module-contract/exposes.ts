/**
 * The names of what a module shows the other features, its own `exposes`:
 * `readonly exposes = { useCases: ['get'], events: ['created'] } as const`. A module
 * without one shows nothing.
 */
export type Exposes = { readonly useCases?: readonly string[], readonly events?: readonly string[] }
