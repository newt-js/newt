const SEGMENT = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/

export function assertStorageKey(key: string): void {
  if (key.length > 900 || !key.split('/').every(segment => SEGMENT.test(segment))) {
    throw new Error(`'${key}' is no storage key: names of letters, digits, '.', '_' and '-', joined by '/'`)
  }
}
