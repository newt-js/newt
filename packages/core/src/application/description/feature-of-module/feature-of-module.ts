/** The feature a module is of, by its name, which is always `<feature>[<module>]`: `campaigns` for `campaigns[template]`. */
export function featureOfModule(module: string): string {
  return module.slice(0, module.indexOf('['))
}
