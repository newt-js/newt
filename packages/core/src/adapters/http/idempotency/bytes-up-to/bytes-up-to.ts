export async function bytesUpTo(response: Response, max: number): Promise<{ bytes: Uint8Array<ArrayBuffer> } | { whole: Response }> {
  if (!response.body) {
    return { bytes: new Uint8Array() }
  }
  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
  let total = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) {
      break
    }
    chunks.push(value)
    total += value.byteLength
    if (total > max) {
      const rest = new ReadableStream<Uint8Array>({
        start: controller => chunks.forEach(chunk => controller.enqueue(chunk)),
        pull: async controller => {
          const next = await reader.read()
          if (next.done) {
            controller.close()
          } else {
            controller.enqueue(next.value)
          }
        },
        cancel: reason => reader.cancel(reason),
      })
      return { whole: new Response(rest, { status: response.status, statusText: response.statusText, headers: response.headers }) }
    }
  }
  const bytes = new Uint8Array(total)
  let at = 0
  for (const chunk of chunks) {
    bytes.set(chunk, at)
    at += chunk.byteLength
  }
  return { bytes }
}
