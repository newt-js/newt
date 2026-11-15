export type JobFlow = { queue: string, kind: 'delivered' | 'redelivered' | 'dead', waitMs: number }
