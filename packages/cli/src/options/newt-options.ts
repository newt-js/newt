import type { Option } from '../commands/command'

const HELP_OPTION: Option = { type: 'boolean', short: 'h', description: 'Show this help' }

const VERSION_OPTION: Option = { type: 'boolean', short: 'v', description: 'Show the version' }

const DRY_RUN_OPTION: Option = { type: 'boolean', description: 'Show what would change, writing nothing' }

const JSON_OPTION: Option = { type: 'boolean', description: 'Print the result as JSON' }

export const NEWT_OPTIONS = { help: HELP_OPTION, version: VERSION_OPTION, json: JSON_OPTION }

export const COMMAND_OPTIONS = { 'dry-run': DRY_RUN_OPTION, 'json': JSON_OPTION, 'help': HELP_OPTION }
