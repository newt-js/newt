/** A module is named with one word in camelCase, `oauthSigningKey`; never `newt…`, as newt's own tables are. */
export const MODULE_NAME = /^(?!newt[A-Z0-9])[a-z][A-Za-z0-9]*$/

/** A word in camelCase, from one in kebab, snake or PascalCase, or from the old `<feature>[<module>]`. */
const camel = (word: string) => word
  .replace(/[-_.[\]/]+([a-zA-Z0-9])/g, (_, next: string) => next.toUpperCase())
  .replace(/\W+$/, '')
  .replace(/^[A-Z]/, first => first.toLowerCase())

/** The error of a module whose name is not one word in camelCase. */
export function moduleNameError(name: string): Error {
  const fixed = camel(name)
  const isNewt = /^newt[A-Z0-9]/.test(name)
  const advice = isNewt ? ': newt… names newt\'s own tables' : MODULE_NAME.test(fixed) ? `: write '${fixed}'` : ''
  return new Error(`A module is named with one word in camelCase, as 'oauthSigningKey': '${name}' is not${advice}`)
}
