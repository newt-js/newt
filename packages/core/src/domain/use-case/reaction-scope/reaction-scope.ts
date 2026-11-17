import { defineScope }      from '../../scope/define-scope'
import type { ReactionRun } from '../reaction-run'

export const reactionScope = defineScope<ReactionRun>('reaction')
