import type { ReactNode }       from 'react'
// --------------------------------------------------------
import type { LinkComponent }   from './link-component'
import { LinkComponentContext } from './link-component'

/** Makes every link of the components navigate with the app's router instead of reloading the page. Render it once, around the app. */
export function LinkProvider({ component, children }: { component: LinkComponent, children: ReactNode }) {
  return <LinkComponentContext.Provider value={component}>{children}</LinkComponentContext.Provider>
}
