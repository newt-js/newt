import { z } from 'zod'

export class InvalidEvent extends Error {
  constructor(event: string, error: z.ZodError) {
    const where = (path: PropertyKey[]) => path.map(String).join('.') || '(root)'
    super(`${event}'s payload does not pass its schema: ${error.issues.map(issue => `${where(issue.path)}: ${issue.message}`).join('; ')}`)
    this.name = 'InvalidEvent'
    this.cause = error
  }
}
