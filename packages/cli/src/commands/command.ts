export type Output = { code: number, text: string }

export type Option = { type: 'boolean' | 'string', description: string, short?: string, value?: string }

export type Options = Record<string, Option>

export type OptionValues<O extends Options> = { [K in keyof O]?: O[K]['type'] extends 'boolean' ? boolean : string }

export type Ask = (question: string, suggested: string) => Promise<string>

export type CommandContext = { cwd: string, ask: Ask | null }

export type CommandInput<O extends Options> = CommandContext & { args: string[], options: OptionValues<O> }

export type CreateChange = { action: 'create', path: string, content: string }

export type CompleteJsonChange = { action: 'complete-json', path: string, values: Record<string, unknown> }

export type EnsureLinesChange = { action: 'ensure-lines', path: string, lines: string[] }

export type RemoveUnchangedChange = { action: 'remove-unchanged', path: string, content: string, why: string }

export type RemoveJsonKeyChange = { action: 'remove-json-key', path: string, key: string, value: unknown, whenMissing: string }

export type CompleteEnvChange = { action: 'complete-env', path: string, variables: Record<string, string> }

export type InsertLinesChange = { action: 'insert-lines', path: string, anchor: string, position: 'before' | 'after', lines: string[], imports: string[] }

export type ReplaceLineChange = { action: 'replace-line', path: string, line: string, with: string, imports: string[] }

export type KeepLineBelowChange = { action: 'keep-line-below', path: string, line: string, below: string }

export type AppendBlockChange = { action: 'append-block', path: string, block: string }

export type AddClassMemberChange = { action: 'add-class-member', path: string, className: string, name: string, member: string, imports: string[] }

export type AddObjectPropertyChange = { action: 'add-object-property', path: string, call: string, argument: number, key: string, value: string, imports: string[] }

export type FileChange =
  | CreateChange
  | CompleteJsonChange
  | EnsureLinesChange
  | RemoveUnchangedChange
  | RemoveJsonKeyChange
  | CompleteEnvChange
  | InsertLinesChange
  | ReplaceLineChange
  | AddClassMemberChange
  | AddObjectPropertyChange
  | AppendBlockChange
  | KeepLineBelowChange

export type CommandResult = { changes: FileChange[], warnings?: string[], nextSteps?: string[] }

export type Command<O extends Options = Options> = {
  name: string
  summary: string
  args?: string
  options?: O
  run(input: CommandInput<O>): Promise<CommandResult>
}

export function defineCommand<const O extends Options = Record<never, Option>>(command: Command<O>): Command<O> {
  return command
}
