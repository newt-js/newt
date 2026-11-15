import { defineScope } from '../../scope/define-scope'

export const workerScope = defineScope<true>('worker')
