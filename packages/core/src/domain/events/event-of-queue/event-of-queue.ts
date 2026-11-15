const QUEUE = /^[a-z][A-Za-z0-9]*\.[a-z][A-Za-z0-9]*\.on\.(.+)$/

export function eventOfQueue(queue: string): string | undefined {
  return QUEUE.exec(queue)?.[1]
}
