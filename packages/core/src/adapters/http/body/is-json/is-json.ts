export function isJson(contentType: string | null): boolean {
  const type = contentType?.split(';')[0]!.trim().toLowerCase() ?? ''
  return type === 'application/json' || (type.startsWith('application/') && type.endsWith('+json'))
}
