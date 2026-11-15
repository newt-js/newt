import { defineScope } from '../../scope/define-scope'
import { Clock }       from '../clock'

export const clockScope = defineScope<Clock>('clock')
