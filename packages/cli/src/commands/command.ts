export type Output = { code: number, text: string }

export type Option = { type: 'boolean' | 'string', description: string, short?: string, value?: string }

export type Options = Record<string, Option>

export type OptionValues<O extends Options> = { [K in keyof O]?: O[K]['type'] extends 'boolean' ? boolean : string }

export type CommandInput<O extends Options> = { args: string[], options: OptionValues<O>, cwd: string }

export type Command<O extends Options = Options> = {
  name: string
  summary: string
  args?: string
  options?: O
  run(input: CommandInput<O>): Promise<Output>
}

export function defineCommand<const O extends Options = Record<never, Option>>(command: Command<O>): Command<O> {
  return command
}
