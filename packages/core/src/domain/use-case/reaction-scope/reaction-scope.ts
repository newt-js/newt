import { defineScope } from '../../scope/define-scope'
import { ReactionRun } from '../reaction-run'

export const reactionScope = defineScope<ReactionRun>('reaction')
