export type SecurityHeaders = Record<string, string | null>

export type Hsts = { maxAgeSeconds?: number, includeSubDomains?: boolean, preload?: boolean }

export const SECURITY_HEADERS: Readonly<Record<string, string>> = {
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'strict-origin-when-cross-origin',
  'x-frame-options': 'DENY',
}
