export class GuardTimeout extends Error {
  constructor(readonly keys: string[], readonly waitMs: number) {
    super(`Waited ${waitMs} ms for ${keys.join(', ')}, held by another transaction, and gave up`)
    this.name = 'GuardTimeout'
  }
}
