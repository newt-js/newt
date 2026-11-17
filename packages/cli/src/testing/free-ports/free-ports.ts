const isFree = (port: number) => {
  try {
    Bun.serve({ port, fetch: () => new Response() }).stop(true)
    return true
  } catch {
    return false
  }
}

/** A port that is free, with each of `others` past it free too: 4310 and 4320 for [10]. */
export function freePorts(others: number[] = []): number {
  for (;;) {
    const port = 20_000 + Math.floor(Math.random() * 40_000)
    if ([0, ...others].every(step => isFree(port + step))) return port
  }
}
