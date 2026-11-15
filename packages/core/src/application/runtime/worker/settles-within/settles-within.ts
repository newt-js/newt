export async function settlesWithin(promise: Promise<unknown>, ms: number): Promise<boolean> {
  let timer: ReturnType<typeof setTimeout> | undefined
  const late = new Promise<false>(resolve => timer = setTimeout(resolve, ms, false))
  try {
    return await Promise.race([promise.then(() => true, () => true), late])
  } finally {
    clearTimeout(timer)
  }
}
