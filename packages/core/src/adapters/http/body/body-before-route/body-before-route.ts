import { bodyReads } from './body-reads'

export function bodyBeforeRoute(request: Request): Promise<Uint8Array<ArrayBuffer>> {
  const read = bodyReads.get(request)
  if (read) {
    return read()
  }
  return request.body ? request.clone().arrayBuffer().then(buffer => new Uint8Array(buffer)) : Promise.resolve(new Uint8Array())
}
