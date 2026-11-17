import { default as ts } from 'typescript'

/** How many syntax errors a .ts or .tsx file has; 0 for other files. */
export function syntaxErrors(path: string, text: string | null): number {
  if (text === null || !/\.tsx?$/.test(path)) return 0
  return ts.transpileModule(text, { fileName: path, reportDiagnostics: true }).diagnostics?.length ?? 0
}
