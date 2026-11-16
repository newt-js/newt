import { DEFAULT_PORT } from '../../../options/port-of/port-of'

export const PORT_STEP = 10

/** The port after the highest one in use, so backends added one after another never share one. */
export function nextPort(used: Iterable<number>): number {
  const ports = [...used]
  return ports.length === 0 ? DEFAULT_PORT : Math.max(...ports) + PORT_STEP
}
