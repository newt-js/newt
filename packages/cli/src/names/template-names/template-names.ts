/** Names newt's module templates use for their own variables, members and imports. */
export const TEMPLATE_VARIABLES = new Set([
  'module', 'base', 'router', 'events', 'deps', 'input', 'criteria', 'sort', 'page', 'found', 'orderBy', 'each', 'context',
  'database', 'created', 'response', 'posted', 'read', 'request', 'id', 'z', 'name', 'on',
  'queued', 'first', 'second', 'opened', 'signedIn', 'described', 'uses', 'features',
])

export const TEMPLATE_TYPES = new Set([
  'Entity', 'EntityInput', 'Module', 'Repository', 'Page', 'PageRequest', 'UseCase', 'ContextBase', 'HttpRouter', 'Uuid', 'Platform',
  'BoundedContext', 'Feature', 'TestContext', 'MemoryCluster', 'MemoryDatabase', 'NotFoundError', 'Error', 'Promise', 'Response', 'Request',
])
