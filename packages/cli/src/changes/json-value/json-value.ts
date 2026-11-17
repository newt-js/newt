import { default as ts } from 'typescript'

/** The value a node of a JSON or JSONC file holds. */
export function jsonValue(text: string, node: ts.Node, source: ts.SourceFile): unknown {
  return (ts.parseConfigFileTextToJson('value.json', `{"value": ${text.slice(node.getStart(source), node.getEnd())}}`).config as { value: unknown }).value
}
