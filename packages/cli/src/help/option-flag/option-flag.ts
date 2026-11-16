import type { Option } from '../../commands/command'

export function optionFlag(name: string, option: Option): string {
  const short = option.short ? `-${option.short}, ` : '    '
  const value = option.type === 'string' ? ` <${option.value ?? 'value'}>` : ''
  return `${short}--${name}${value}`
}
