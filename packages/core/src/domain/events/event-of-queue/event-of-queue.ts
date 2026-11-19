const NAME = '[a-z][A-Za-z0-9]*'

/** `<module>.<use case>_on_<event>`, the queue of a handler. */
const MODULE_QUEUE = new RegExp(`^(${NAME}\\.${NAME})_on_(.+)$`)

const shapeOf = (queue: string) => MODULE_QUEUE.exec(queue)

/** The event a handler's queue reacts to: what follows its use case and `_on_`. */
export function eventOfQueue(queue: string): string | undefined {
  return shapeOf(queue)?.[2]
}

/** The use case a handler's queue calls, `template.create`: what comes before `_on_`. */
export function useCaseOfQueue(queue: string): string | undefined {
  return shapeOf(queue)?.[1]
}

/** The queue of a handler of `module` (`template`) that calls `useCase` on `event`. */
export function queueOf(module: string, useCase: string, event: string): string {
  return `${module}.${useCase}_on_${event}`
}
