export const isPackage = (line: { path: string }) => !line.path.startsWith('.')
