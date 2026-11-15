import { Observability } from '../observability'

export const noObservability: Observability = {
  useCase: (_, run) => run({ retrying: () => {} }),
  warn: () => {},
}
