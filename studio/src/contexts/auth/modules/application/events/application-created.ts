import { defineEvent }       from '@newt-js/core'
// --------------------------------------------------------
import { ApplicationSchema } from '../application.schema'

export const Application_Created = defineEvent(
  'application.created',
  ApplicationSchema,
)
