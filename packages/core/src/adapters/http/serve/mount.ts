import type { FrontendMount } from './serve-options'

/** A frontend where serve answers it; in production, an HTML import is the folder it is being built into. */
export type Mount = Omit<FrontendMount, 'app'> & { prefix: string, app: FrontendMount['app'] | Promise<string> }

/** An app Bun bundles and serves itself, by its routes: an HTML import, in development. */
export const isSourceApp = (app: Mount['app']): app is Bun.HTMLBundle => typeof app === 'object' && !(app instanceof Promise)
