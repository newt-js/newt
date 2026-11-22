// Values the layout primitives accept. Class names are spelled out in full so
// Tailwind can find them when it scans the library.

export type Space = 0 | 1 | 2 | 3 | 4 | 6 | 8 | 12 | 16

export const gapClass: Record<Space, string> = {
  0: 'gap-0',
  1: 'gap-1',
  2: 'gap-2',
  3: 'gap-3',
  4: 'gap-4',
  6: 'gap-6',
  8: 'gap-8',
  12: 'gap-12',
  16: 'gap-16',
}

export type Align = 'start' | 'center' | 'end' | 'stretch'

export const alignClass: Record<Align, string> = {
  start: 'items-start',
  center: 'items-center',
  end: 'items-end',
  stretch: 'items-stretch',
}

export type Justify = 'start' | 'center' | 'end' | 'between'

export const justifyClass: Record<Justify, string> = {
  start: 'justify-start',
  center: 'justify-center',
  end: 'justify-end',
  between: 'justify-between',
}

export const paddingClass: Record<Space, string> = {
  0: 'p-0',
  1: 'p-1',
  2: 'p-2',
  3: 'p-3',
  4: 'p-4',
  6: 'p-6',
  8: 'p-8',
  12: 'p-12',
  16: 'p-16',
}

/** Fixed widths, for a side column or a narrow form; `full` is as wide as its container. */
export type Width = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'full'

export const widthClass: Record<Width, string> = {
  xs: 'w-48 shrink-0',
  sm: 'w-64 shrink-0',
  md: 'w-80 shrink-0',
  lg: 'w-96 shrink-0',
  xl: 'w-[32rem] shrink-0',
  full: 'w-full',
}
