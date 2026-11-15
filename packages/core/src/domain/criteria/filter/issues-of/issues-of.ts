import { z } from 'zod'

export const issuesOf = (error: z.ZodError) => error.issues.map(issue => ({ path: issue.path.map(String).join('.'), message: issue.message }))
