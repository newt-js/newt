import { PayloadTooLarge } from '../../errors/payload-too-large/payload-too-large'

export async function readUpTo(body: ReadableStream<Uint8Array>, max: number): Promise<Uint8Array<ArrayBuffer>> {
  const chunks: Uint8Array[] = []
  let total = 0
  for await (const chunk of body) {
    total += chunk.byteLength
    if (total > max) {
      throw new PayloadTooLarge(max)
    }
    chunks.push(chunk)
  }
  const all = new Uint8Array(total)
  let at = 0
  for (const chunk of chunks) {
    all.set(chunk, at)
    at += chunk.byteLength
  }
  return all
}
