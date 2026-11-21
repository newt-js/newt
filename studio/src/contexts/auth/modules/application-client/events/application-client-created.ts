import { defineEvent }                   from '@newt-js/core'
// --------------------------------------------------------
import { ApplicationClientPublicSchema } from '../application-client.schema'

export const ApplicationClient_Created = defineEvent(
  'applicationClient.created',
  ApplicationClientPublicSchema,
)
