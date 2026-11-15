export type ApplicationDescription = {
  version: 1
  contexts: ContextDescription[]
}

export type ContextDescription = {
  name: string
  uses: string[]
  modules: ModuleDescription[]
  subscriptions: SubscriptionDescription[]
}

export type ModuleDescription = {
  id: string
  context: string
  name: string
  className: string
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
