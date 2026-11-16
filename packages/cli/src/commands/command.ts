export type Output = { code: number, text: string }

export type Option = { type: 'boolean' | 'string', description: string, short?: string, value?: string }

export type Options = Record<string, Option>

export type OptionValues<O extends Options> = { [K in keyof O]?: O[K]['type'] extends 'boolean' ? boolean : string }

export type Ask = (question: string, suggested: string) => Promise<string>

export type CommandContext = { cwd: string, ask: Ask | null }

export type CommandInput<O extends Options> = CommandContext & { args: string[], options: OptionValues<O> }

export type FileChange = { action: 'create', path: string, content: string }

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
