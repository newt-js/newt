export type ApplicationDescription = {
  version: 2
  contexts: ContextDescription[]
}

export type ContextDescription = {
  name: string
  uses: string[]
  features: FeatureDescription[]
  modules: ModuleDescription[]
  subscriptions: SubscriptionDescription[]
}

/** A feature of a context: the ids of its modules, and of those its contract shows. */
export type FeatureDescription = {
  id: string
  name: string
  modules: string[]
  shows: string[]
}

export type ModuleDescription = {
  id: string
  context: string
  name: string
  feature: string | null
  className: string
  exposes: { useCases: string[], events: string[] }
  useCases: UseCaseDescription[]
  events: EventDescription[]
  deps: ModuleDependency[]
}

export type UseCaseDescription = {
  id: string
  name: string
  retryOnConflict: boolean
}

export type EventDescription = {
  id: string
  name: string
  schedule: { cron: string } | null
}

export type ModuleDependency =
  | { name: string, kind: 'module', target: string }
  | { name: string, kind: 'feature', target: string }
  | { name: string, kind: 'events', target: string | null, events: string[] }
  | { name: string, kind: 'port', target: null }

export type SubscriptionDescription = {
  event: string
  strategy: 'handler' | 'fire-and-forget'
  queue: string | null
  handler: string | null
  attempts: number | null
  filtered: boolean | null
}
