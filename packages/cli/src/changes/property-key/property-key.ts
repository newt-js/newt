import { default as ts } from 'typescript'

export function propertyKey(property: ts.ObjectLiteralElementLike): string | undefined {
  const name = property.name
  if (!name) return undefined
  if (ts.isIdentifier(name) || ts.isStringLiteral(name) || ts.isPrivateIdentifier(name)) return name.text
  if (ts.isComputedPropertyName(name) && ts.isStringLiteral(name.expression)) return name.expression.text
  return undefined
}
