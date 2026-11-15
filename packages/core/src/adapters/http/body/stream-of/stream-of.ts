export function streamOf(read: Promise<Uint8Array>, onRead = () => {}): ReadableStream<Uint8Array> {
  return new ReadableStream({
    pull: async controller => {
      onRead()
      controller.enqueue(await read)
      controller.close()
    },
  }, { highWaterMark: 0 })
}
