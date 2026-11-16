import { ADD_BACKEND }  from './add-backend/add-backend'
import { ADD_CONTEXT }  from './add-context/add-context'
import { ADD_ERROR }    from './add-error/add-error'
import { ADD_EVENT }    from './add-event/add-event'
import { ADD_FILES }    from './add-files/add-files'
import { ADD_MODULE }   from './add-module/add-module'
import type { Command } from './command'
import { INIT }         from './init/init'

export const COMMANDS: Command[] = [INIT, ADD_BACKEND, ADD_CONTEXT, ADD_FILES, ADD_MODULE, ADD_EVENT, ADD_ERROR]
