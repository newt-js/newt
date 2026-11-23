import type { ModuleNames } from '../../../names/module-names/module-names'
import type { PieceNames }  from '../../../names/piece-names/piece-names'
import { withArticle }      from '../../../names/with-article/with-article'
import type { SchemaField } from '../../../project/schema-fields/schema-fields'

/** What a feature bound to a module shows of it: the columns of its list, and the fields of its form. */
export type FeatureOfModule = { module: ModuleNames, columns: SchemaField[], inputs: SchemaField[] }

/** A field's name as a person reads it: `createdAt` is Created at. */
const labelOf = (name: string) => {
  const words = name.replace(/[A-Z]/g, letter => ` ${letter.toLowerCase()}`)
  return words[0]!.toUpperCase() + words.slice(1)
}

/** Text a cell shows as it is; anything else, written out. */
const isText = (zod: string) => /^z\.(string|number|email|url|uuid|iso)\b/.test(zod)

/** The rule an input copies: a text one as the module wrote it, anything else as plain text, to be copied by hand. */
export const copiedRule = (zod: string) => zod.startsWith('z.string()') ? zod : 'z.string()'

/** Imports with their `from` in one column, as newt's lint wants them: packages, then a line, then the app's. */
const importBlock = (outside: [string, string][], inside: [string, string][]) => {
  const all = [...outside, ...inside]
  const width = Math.max(...all.map(([what]) => what.length))
  const pad = (lines: [string, string][]) => lines.map(([what, from]) => `${what.padEnd(width)} from '${from}'`).join('\n')
  if (inside.length === 0) return pad(outside)
  if (outside.length === 0) return pad(inside)
  return `${pad(outside)}\n// --------------------------------------------------------\n${pad(inside)}`
}

export function featureRouteLines(feature: PieceNames) {
  return {
    lazy: `const ${feature.type} = lazy(() => import('./features/${feature.folder}/${feature.folder}').then(({ ${feature.type} }) => ({ default: ${feature.type} })))`,
    route: `        <Route path="${feature.folder}" element={<${feature.type} />} />`,
  }
}

/** A module's plural as a person reads it: `price changes`. */
const pluralWords = (module: ModuleNames) => module.path.replaceAll('-', ' ')

const heading = (feature: PieceNames) => feature.words[0]!.toUpperCase() + feature.words.slice(1)

export function featureTsx(feature: PieceNames, bound: FeatureOfModule | null): string {
  const parts = bound === null ? [] : [`${feature.type}Form`, `${feature.type}List`]
  const outside: [string, string][] = [
    ['import { Column }', '@newt-js/react'],
    ['import { Container }', '@newt-js/react'],
    ['import { Heading }', '@newt-js/react'],
    ['import { Provide }', '@newt-js/react'],
  ]
  const inside: [string, string][] = [
    ...parts.map((part): [string, string] => {
      const name = `${feature.folder}-${part.slice(feature.type.length).toLowerCase()}`
      return [`import { ${part} }`, `./${name}/${name}`]
    }),
    [`import { ${feature.type}Service }`, `./${feature.folder}.service`],
  ]
  return `${importBlock(outside, inside)}

/** ${heading(feature)}: its service lives while it is open. */
export function ${feature.type}() {
  return (
    <Provide services={[${feature.type}Service]}>
      <Container>
        <Column padding={8} gap={6}>
          <Heading>${heading(feature)}</Heading>
${parts.map(part => `          <${part} />\n`).join('')}        </Column>
      </Container>
    </Provide>
  )
}
`
}

export function featureApiTs(feature: PieceNames, bound: FeatureOfModule | null): string {
  if (bound === null) {
    return `import { Requester } from '@newt-js/client'

/** The requests of ${feature.words}: one method each. */
export class ${feature.type}Api extends Requester {

  protected readonly path = '/${feature.folder}'
}
`
  }
  const { module } = bound
  const schema = `../../../modules/${module.folder}`
  return `${importBlock(
    [['import type { Page }', '@newt-js/client'], ['import { Requester }', '@newt-js/client']],
    [[`import type { ${module.type}CreateDTO }`, schema], [`import type { ${module.type}DTO }`, schema]],
  )}

/** The requests of ${feature.words}, to the module ${module.folder}. */
export class ${feature.type}Api extends Requester {

  protected readonly path = '/${module.path}'

  list(cursor: string | undefined) {
    return this.get<Page<${module.type}DTO>>('', { cursor })
  }

  create(${module.module}: ${module.type}CreateDTO) {
    return this.post<${module.type}DTO>('', ${module.module})
  }
}
`
}

export function featureServiceTs(feature: PieceNames, bound: FeatureOfModule | null): string {
  if (bound === null) {
    return `${importBlock([['import { inject }', '@newt-js/client']], [[`import { ${feature.type}Api }`, `./${feature.folder}.api`]])}

/** What the screens of ${feature.words} show, and what changes it. */
export class ${feature.type}Service {

  protected readonly api = inject(${feature.type}Api)
}
`
  }
  const { module } = bound
  return `${importBlock(
    [['import { FormStore }', '@newt-js/client'], ['import { inject }', '@newt-js/client'], ['import { ListStore }', '@newt-js/client']],
    [
      [`import type { ${module.type}DTO }`, `../../../modules/${module.folder}`],
      [`import { ${feature.type}Api }`, `./${feature.folder}.api`],
      [`import { ${feature.camel}Form }`, `./${feature.folder}.state`],
      [`import { ${feature.camel}FormStart }`, `./${feature.folder}.state`],
    ],
  )}

/** What the screens of ${feature.words} show: the list of ${pluralWords(module)}, and the form that adds one. */
export class ${feature.type}Service {

  private readonly api = inject(${feature.type}Api)
  readonly list = new ListStore<${module.type}DTO>((_, cursor) => this.api.list(cursor))
  readonly form = new FormStore(${feature.camel}Form, ${feature.camel}FormStart)

  /** Sends the form; once the backend has it, the form starts again and the list shows it. */
  async create(): Promise<void> {
    const created = await this.form.submit(values => this.api.create(values))
    if (created !== null) {
      this.form.reset()
      await this.list.reload()
    }
  }
}
`
}

export function featureStateTs(feature: PieceNames, { module, inputs }: FeatureOfModule): string {
  return `import { z } from 'zod'

/** What the form checks before sending: the rules of ${module.folder}'s create, copied from its schema. */
export const ${feature.camel}Form = z.object({
${inputs.map(input => `  ${input.name}: ${copiedRule(input.zod)},\n`).join('')}})

export const ${feature.camel}FormStart = { ${inputs.map(input => `${input.name}: ''`).join(', ')} }
`
}

export function featureFormTsx(feature: PieceNames, { module, inputs }: FeatureOfModule): string {
  const service = feature.camel
  return `${importBlock(
    [
      ['import { Button }', '@newt-js/react'],
      ['import { Field }', '@newt-js/react'],
      ['import { Form }', '@newt-js/react'],
      ['import { Input }', '@newt-js/react'],
      ['import { useFormField }', '@newt-js/react'],
      ['import { useService }', '@newt-js/react'],
      ['import { useValue }', '@newt-js/react'],
    ],
    [[`import { ${feature.type}Service }`, `../${feature.folder}.service`]],
  )}

/** The form that adds ${withArticle(module.words)}. */
export function ${feature.type}Form() {
  const ${service} = useService(${feature.type}Service)
  const submitting = useValue(${service}.form.submitting)
${inputs.map(input => `  const ${input.name} = useFormField(${service}.form, '${input.name}')\n`).join('')}  return (
    <Form form={${service}.form} onSubmit={() => void ${service}.create()}>
${inputs.map(input => `      <Field label="${labelOf(input.name)}" error={${input.name}.error}>\n        <Input {...${input.name}.control} />\n      </Field>\n`).join('')}      <Button type="submit" loading={submitting}>Add ${module.words}</Button>
    </Form>
  )
}
`
}

export function featureListTsx(feature: PieceNames, { module }: FeatureOfModule): string {
  const service = feature.camel
  return `${importBlock(
    [
      ['import { Column }', '@newt-js/react'],
      ['import { LoadMore }', '@newt-js/react'],
      ['import { Table }', '@newt-js/react'],
      ['import { TableBody }', '@newt-js/react'],
      ['import { useService }', '@newt-js/react'],
      ['import { useValue }', '@newt-js/react'],
      ['import { useEffect }', 'react'],
    ],
    [
      [`import { ${feature.type}ListHead }`, `./${feature.folder}-list-head/${feature.folder}-list-head`],
      [`import { ${feature.type}ListRow }`, `./${feature.folder}-list-row/${feature.folder}-list-row`],
      [`import { ${feature.type}Service }`, `../${feature.folder}.service`],
    ],
  )}

/** The ${pluralWords(module)}, newest first, a page at a time. */
export function ${feature.type}List() {
  const ${service} = useService(${feature.type}Service)
  const items = useValue(${service}.list.items)
  useEffect(() => {
    void ${service}.list.load({})
  }, [${service}])
  return (
    <Column gap={4}>
      <Table caption="${heading(feature)}">
        <${feature.type}ListHead />
        <TableBody>
          {items.map(${module.module} => <${feature.type}ListRow key={${module.module}.id} ${module.module}={${module.module}} />)}
        </TableBody>
      </Table>
      <LoadMore list={${service}.list} />
    </Column>
  )
}
`
}

export function featureListHeadTsx(feature: PieceNames, { columns }: FeatureOfModule): string {
  return `${importBlock([['import { TableHead }', '@newt-js/react'], ['import { TableHeader }', '@newt-js/react'], ['import { TableRow }', '@newt-js/react']], [])}

export function ${feature.type}ListHead() {
  return (
    <TableHeader>
      <TableRow>
${columns.map(column => `        <TableHead>${labelOf(column.name)}</TableHead>\n`).join('')}      </TableRow>
    </TableHeader>
  )
}
`
}

export function featureListRowTsx(feature: PieceNames, { module, columns }: FeatureOfModule): string {
  const one = module.module
  const cell = (column: SchemaField) => isText(column.zod) ? `{${one}.${column.name}}` : `{String(${one}.${column.name})}`
  return `${importBlock(
    [['import { TableCell }', '@newt-js/react'], ['import { TableRow }', '@newt-js/react']],
    [[`import type { ${module.type}DTO }`, `../../../../../modules/${module.folder}`]],
  )}

export function ${feature.type}ListRow({ ${one} }: { ${one}: ${module.type}DTO }) {
  return (
    <TableRow>
${columns.map(column => `      <TableCell>${cell(column)}</TableCell>\n`).join('')}    </TableRow>
  )
}
`
}
