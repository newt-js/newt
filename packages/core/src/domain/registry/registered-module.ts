export type RegisteredModule = {
  instance: { readonly name: string }
  className: string
  deps: object | undefined
  useCases: Map<string, object>
}
