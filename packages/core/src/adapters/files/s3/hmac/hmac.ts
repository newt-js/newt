export const hmac = (key: string | Uint8Array, text: string) =>
  new Bun.CryptoHasher('sha256', key).update(text).digest()
