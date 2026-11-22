import { rootInjector }  from '@newt-js/client'
import { createContext } from 'react'

/** The injector of the closest `Provide` above, or the app's. */
export const InjectorContext = createContext(rootInjector)
