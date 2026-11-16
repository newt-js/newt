import { Option } from '../commands/command'

export const HELP_OPTION: Option = { type: 'boolean', short: 'h', description: 'Show this help' }

export const VERSION_OPTION: Option = { type: 'boolean', short: 'v', description: 'Show the version' }

export const DRY_RUN_OPTION: Option = { type: 'boolean', description: 'Show what would change, writing nothing' }

export const JSON_OPTION: Option = { type: 'boolean', description: 'Print the result as JSON' }

export const NEWT_OPTIONS = { help: HELP_OPTION, version: VERSION_OPTION }

export const COMMAND_OPTIONS = { 'dry-run': DRY_RUN_OPTION, 'json': JSON_OPTION, 'help': HELP_OPTION }
