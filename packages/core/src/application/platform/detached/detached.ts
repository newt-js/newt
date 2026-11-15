import { AsyncLocalStorage } from 'node:async_hooks'

export const detached = AsyncLocalStorage.snapshot()
