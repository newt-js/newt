export const escapedKey = (key: string) => key.replaceAll('\\', '\\\\').replaceAll('\0', '\\0')
