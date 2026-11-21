import type { ReadonlySignal }  from '@newt-js/client'
import { useCallback }          from 'react'
import { useSyncExternalStore } from 'react'

/** Reads a signal in render and repaints the component when, and only when, it changes. */
export function useValue<T>(source: ReadonlySignal<T>): T {
  const subscribe = useCallback((onChange: () => void) => source.subscribe(() => onChange()), [source])
  const read = () => source.peek()
  return useSyncExternalStore(subscribe, read, read)
}
