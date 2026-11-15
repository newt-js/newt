export function keepingParams(request: Request, copy: Request): Request {
  for (const name of ['params', 'cookies']) {
    const own = Object.getOwnPropertyDescriptor(request, name)
    if (own) {
      Object.defineProperty(copy, name, own)
    }
  }
  return copy
}
