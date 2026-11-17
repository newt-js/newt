import { CommandError } from '../../commands/command-error/command-error'

export type ContextNames = { folder: string, type: string, camel: string, env: string }

const KEBAB = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/

/** A context's names from its folder's, `web-session`: `WebSession`, `webSession` and `WEB_SESSION`. */
export function contextNames(name: string): ContextNames {
  if (!KEBAB.test(name)) {
    throw new CommandError(`'${name}' cannot name a context: lowercase words joined by -, as in shop or web-session`)
  }
  const words = name.split('-')
  const type = words.map(word => word[0]!.toUpperCase() + word.slice(1)).join('')
  return { folder: name, type, camel: type[0]!.toLowerCase() + type.slice(1), env: words.join('_').toUpperCase() }
}
