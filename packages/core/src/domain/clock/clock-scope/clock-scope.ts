import { defineScope } from '../../scope/define-scope'
import type { Clock }  from '../clock'

export const clockScope = defineScope<Clock>('clock')
