const BACKEND_NAME = /^[a-z0-9]([a-z0-9._~-]*[a-z0-9])?$/

const TAKEN = new Set(['node_modules'])

const MAX_LENGTH = 214

/** A name that is both a folder and a package name: lowercase letters, digits and - . _ ~, a letter or a digit at each end. */
export function isBackendName(text: string): boolean {
  return text.length <= MAX_LENGTH && BACKEND_NAME.test(text) && !TAKEN.has(text)
}
