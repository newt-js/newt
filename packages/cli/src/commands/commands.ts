import { ADD_BACKEND }  from './add-backend/add-backend'
import type { Command } from './command'
import { INIT }         from './init/init'

export const COMMANDS: Command[] = [INIT, ADD_BACKEND]
