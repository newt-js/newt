import type { Resolved }       from '@newt-js/core'
import { defineFilter }        from '@newt-js/core'
import { z }                   from 'zod'
// --------------------------------------------------------
import type { ApplicationDTO } from '../application/application.schema'
import { ApplicationId }       from './value-objects/application-id'
import { UserId }              from './value-objects/user-id'

/** Kept in lower case: `Ana@Example.com` and `ana@example.com` are one. */
const EMAIL = z.string().trim().toLowerCase().max(254).pipe(z.email())

/** A user of one application: tokens say its id, never its email. */
export const UserSchema = z.object({
  id: UserId.schema,
  applicationId: ApplicationId.schema,
  email: EMAIL.nullable(),
  emailVerified: z.boolean(),
  name: z.string().trim().min(1).max(100),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export const UserFilter = defineFilter({
  id: { field: 'id', value: UserId.schema, ops: ['eq', 'in'] },
  applicationId: {
    field: 'applicationId',
    value: ApplicationId.schema,
    ops: ['eq'],
  },
  email: { field: 'email', value: EMAIL, ops: ['eq'] },
  name: { field: 'name', value: z.string(), ops: ['eq', 'ieq'] },
}, { sort: ['email', 'name', 'createdAt'] })

/** The application a user belongs to, shown whole in its DTO. */
export type UserReferences = { applicationId: ApplicationDTO }

export type UserDTO = Resolved<z.infer<typeof UserSchema>, UserReferences>
export type UserFilterDTO = z.input<typeof UserFilter.schema>
export type UserSortDTO = z.input<typeof UserFilter.sortSchema>
