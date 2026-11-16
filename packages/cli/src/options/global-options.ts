import { Option } from '../commands/command'

export const HELP_OPTION: Option = { type: 'boolean', short: 'h', description: 'Show this help' }

export const VERSION_OPTION: Option = { type: 'boolean', short: 'v', description: 'Show the version' }

export const GLOBAL_OPTIONS = { help: HELP_OPTION, version: VERSION_OPTION }
