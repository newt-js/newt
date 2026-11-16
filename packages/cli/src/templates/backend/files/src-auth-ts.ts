export const SRC_AUTH_TS = `import type { Authenticator } from '@newt-js/core/http'

/**
 * Who calls the backend, asked by every context's router. It signs no one in until you
 * write it, so every private route answers 401: read a session cookie or a bearer token
 * here and return \`{ userId }\`, or null.
 */
export const authenticate: Authenticator = async () => null
`

export const AUTH_KEPT = { needs: ['export const authenticate'], warning: 'every context\'s router authenticates with it: export const authenticate: Authenticator from it' }
