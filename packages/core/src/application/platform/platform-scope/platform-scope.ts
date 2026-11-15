import { defineScope } from '../../../domain/scope/define-scope'
import { Platform }    from '../platform/platform'

export const platformScope = defineScope<Platform>('platform')
