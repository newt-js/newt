import { prefixOf } from '../prefix-of/prefix-of'
import { proxyTo }  from '../proxy-to/proxy-to'

export function proxied(proxy: Record<string, string> | undefined): Bun.Serve.Routes<undefined, string> {
  return Object.fromEntries(Object.entries(proxy ?? {}).flatMap(([path, target]) => {
    const prefix = prefixOf(path)
    const route = proxyTo(target)
    return prefix === '' ? [['/*', route]] : [[prefix, route], [`${prefix}/*`, route]]
  }))
}
