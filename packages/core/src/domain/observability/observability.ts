import type { ObservedUseCase } from './observed-use-case'
import type { UseCaseAttempt }  from './use-case-attempt'

export interface Observability {
  useCase<T>(call: ObservedUseCase, run: (attempt: UseCaseAttempt) => Promise<T>): Promise<T>
  warn(message: string, fields: Record<string, unknown>): void
}
