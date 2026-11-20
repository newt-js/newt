import { defineFilter }    from '@newt-js/core'
import { z }               from 'zod'
// --------------------------------------------------------
import { ApplicationId }   from './value-objects/application-id'
import { ApplicationSlug } from './value-objects/application-slug'

export const ApplicationSchema = z.object({
  id: ApplicationId.schema,
  slug: ApplicationSlug.schema,
  name: z.string().trim().min(1).max(100),
  registration: z.enum(['closed']),
  createdAt: z.string(),
  updatedAt: z.string(),
})

/** Without a slug, the application gets one made from its name. */
export const ApplicationCreateSchema = ApplicationSchema.pick({
  slug: true,
  name: true,
}).partial({ slug: true })

export const ApplicationFilter = defineFilter({
  id: { field: 'id', value: ApplicationId.schema, ops: ['eq', 'in'] },
  slug: {
    field: 'slug',
    value: z.string().trim().toLowerCase(),
    ops: ['eq'],
  },
  name: { field: 'name', value: z.string(), ops: ['eq', 'ieq'] },
}, { sort: ['name', 'createdAt'] })

export type ApplicationDTO = z.infer<typeof ApplicationSchema>
export type ApplicationCreateDTO = z.input<typeof ApplicationCreateSchema>
export type ApplicationFilterDTO = z.input<typeof ApplicationFilter.schema>
export type ApplicationSortDTO = z.input<typeof ApplicationFilter.sortSchema>
/** An application, and the address it is at: `<scheme>://<slug>.<host of AUTH_APPLICATIONS_URL>`. */
export type ApplicationAtHostDTO = { application: ApplicationDTO, url: string }
