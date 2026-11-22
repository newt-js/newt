import { Injector } from './injector'

/** The app's injector: a service nobody provides lives here, one instance for the whole app. */
export const rootInjector = new Injector()
