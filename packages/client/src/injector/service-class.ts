/** A service: any class built without arguments. What it needs comes from `inject`. */
export type ServiceClass<T = unknown> = new () => T
