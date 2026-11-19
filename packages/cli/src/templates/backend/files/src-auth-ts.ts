export const SRC_AUTH_TS = `import type { Authenticator } from '@newt-js/core/http'

export const authenticate: Authenticator = async () => null
`

export const AUTH_KEPT = { needs: ['export const authenticate'], warning: 'every context\'s router authenticates with it: export const authenticate: Authenticator from it' }
