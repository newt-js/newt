export type UseCaseAttempt = {
  retrying(error: unknown, attempt: number): void
}
