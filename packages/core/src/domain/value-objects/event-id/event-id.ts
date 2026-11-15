import { Uuid }        from '../uuid/uuid'
import { uuidFactory } from '../uuid/uuid'

export const EventId = uuidFactory('EventId')
export type EventId = Uuid<'EventId'>
