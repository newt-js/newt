import { PayloadTooLarge } from '../../errors/payload-too-large/payload-too-large'

export function limitedStream(body: ReadableStream<Uint8Array>, max: number): ReadableStream<Uint8Array> {
  let total = 0
  return body.pipeThrough(new TransformStream<Uint8Array, Uint8Array>({
    transform: (chunk, controller) => {
      total += chunk.byteLength
      if (total > max) {
        controller.error(new PayloadTooLarge(max))
        return
      }
      controller.enqueue(chunk)
    },
  }))
}
