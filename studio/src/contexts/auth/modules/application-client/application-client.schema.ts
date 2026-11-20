import type { Resolved }       from '@newt-js/core'
import { defineFilter }        from '@newt-js/core'
import { z }                   from 'zod'
// --------------------------------------------------------
import type { ApplicationDTO } from '../application/application.schema'
import { ApplicationClientId } from './value-objects/application-client-id'
import { ApplicationId }       from './value-objects/application-id'
import { RedirectUri }         from './value-objects/redirect-uri'

/** A program that signs people in to an application through OAuth. Its secret is only ever kept hashed. */
export const ApplicationClientSchema = z.object({
  id: ApplicationClientId.schema,
  applicationId: ApplicationId.schema,
  name: z.string().trim().min(1).max(100),
  secretHash: z.string(),
  redirectUris: z.array(RedirectUri.schema).min(1).max(20),
  postLogoutRedirectUris: z.array(RedirectUri.schema).max(20),
  createdAt: z.string(),
  updatedAt: z.string(),
})

/** What a client shows: never its secret's hash. */
export const ApplicationClientPublicSchema = ApplicationClientSchema.omit({ secretHash: true })

/** A client of an application, and where it may be sent back: exact uris, no wildcards. */
export const ApplicationClientRegisterSchema = ApplicationClientSchema.pick({
  applicationId: true,
  name: true,
  redirectUris: true,
  postLogoutRedirectUris: true,
}).partial({ postLogoutRedirectUris: true })

export const ApplicationClientFilter = defineFilter({
  id: { field: 'id', value: ApplicationClientId.schema, ops: ['eq', 'in'] },
  applicationId: { field: 'applicationId', value: ApplicationId.schema, ops: ['eq'] },
}, { sort: ['name', 'createdAt'] })

/** The application a client is of, shown whole in its DTO. */
export type ApplicationClientReferences = { applicationId: ApplicationDTO }

export type ApplicationClientFields = z.infer<typeof ApplicationClientSchema>
export type ApplicationClientDTO =
  Resolved<z.infer<typeof ApplicationClientPublicSchema>, ApplicationClientReferences>
export type ApplicationClientRegisterDTO = z.input<typeof ApplicationClientRegisterSchema>
export type ApplicationClientFilterDTO = z.input<typeof ApplicationClientFilter.schema>
export type ApplicationClientSortDTO = z.input<typeof ApplicationClientFilter.sortSchema>
/** A client just registered, with its secret: the only time the secret is seen. */
export type ApplicationClientRegisteredDTO = { client: ApplicationClientDTO, secret: string }
