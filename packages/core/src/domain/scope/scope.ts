export type Scope<T> = {
  run<R>(value: T, fn: () => R): R
  get(): T | undefined
}
