import { defineScope }      from '../../scope/define-scope'
import type { UseCaseLink } from '../use-case-link'

export const useCaseChainScope = defineScope<{ root: UseCaseLink, current: UseCaseLink, retry: { allowed: boolean } }>('use-case-chain')
