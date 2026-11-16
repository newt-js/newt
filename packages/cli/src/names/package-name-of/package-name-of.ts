import { isBackendName } from '../backend-name/backend-name'

const FALLBACK = 'backend'

/** A valid package name made from any text, a folder's name: `My Shop` is `my-shop`. */
export function packageNameOf(text: string): string {
  const name = text.toLowerCase().replace(/[^a-z0-9._~-]+/g, '-').replace(/^[._~-]+|[._~-]+$/g, '').slice(0, 214)
  if (isBackendName(name)) return name
  const dashed = name.replace(/[._~]+/g, '-')
  return isBackendName(dashed) ? dashed : FALLBACK
}
