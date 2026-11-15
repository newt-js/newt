export const toBytes = async (body: Blob | Uint8Array<ArrayBuffer> | string): Promise<Uint8Array<ArrayBuffer>> =>
  typeof body === 'string' ? new TextEncoder().encode(body) : body instanceof Uint8Array ? body : new Uint8Array(await body.arrayBuffer())
