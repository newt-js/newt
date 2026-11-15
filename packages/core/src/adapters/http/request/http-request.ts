export type ParamsOf<Path extends string> =
  string extends Path ? Record<string, string>
  : Path extends `${string}:${infer Param}/${infer Rest}` ? { [Name in Param | keyof ParamsOf<`/${Rest}`>]: string }
  : Path extends `${string}:${infer Param}` ? { [Name in Param]: string }
  : {}

export type HttpRequest<Path extends string = string> = Request & {
  readonly params: ParamsOf<Path>
  readonly cookies: Bun.CookieMap
}
