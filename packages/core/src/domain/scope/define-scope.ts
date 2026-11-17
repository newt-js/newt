import { AsyncLocalStorage } from 'node:async_hooks'
// --------------------------------------------------------
import type { Scope }        from './scope'

export function defineScope<T>(_name: string): Scope<T> {
  const storage = new AsyncLocalStorage<T>()
  return {
    run: (value, fn) => storage.run(value, fn),
    get: () => storage.getStore(),
  }
}
