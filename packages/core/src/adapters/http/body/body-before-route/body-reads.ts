export const bodyReads = new WeakMap<Request, () => Promise<Uint8Array<ArrayBuffer>>>()
