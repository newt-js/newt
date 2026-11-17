import { defineScope } from '../../scope/define-scope'
import type { Actor }  from '../actor'

export const actorScope = defineScope<Actor>('actor')
