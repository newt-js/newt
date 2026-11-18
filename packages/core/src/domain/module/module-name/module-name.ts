/** `<feature>[<module>]`: a module is always of a feature, and named after both. */
export const MODULE_NAME = /^[a-z][A-Za-z0-9]*\[[a-z][A-Za-z0-9]*\]$/

/** A word in camelCase, from one in kebab, snake or PascalCase: `order-line`, `order_line`, `OrderLine` give `orderLine`. */
const camel = (word: string) => word.replace(/[-_]+([a-zA-Z0-9])/g, (_, next: string) => next.toUpperCase()).replace(/^[A-Z]/, first => first.toLowerCase())

/** What to write instead of a name that is not `<feature>[<module>]`, when newt can tell. */
function suggestion(name: string): string {
  const parts = name.split(/[.[\]/]+/).filter(Boolean)
  if (parts.length === 1) return `: name it after the feature it is in, '<feature>[${camel(parts[0]!)}]', as its folders say (features/<feature>/modules/<module>)`
  const fixed = parts.length === 2 ? `${camel(parts[0]!)}[${camel(parts[1]!)}]` : ''
  return MODULE_NAME.test(fixed) ? `: write '${fixed}'` : ''
}

/** The error of a module whose name is not `<feature>[<module>]`. */
export function moduleNameError(name: string): Error {
  return new Error(`A module is named after its feature and itself, '<feature>[<module>]' in camelCase, as 'campaigns[template]': '${name}' is not${suggestion(name)}`)
}
