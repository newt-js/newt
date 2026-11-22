import { cn }           from 'cn'
// --------------------------------------------------------
import type { Align }   from '../../tokens/tokens'
import type { Justify } from '../../tokens/tokens'
import type { Space }   from '../../tokens/tokens'
import type { Width }   from '../../tokens/tokens'
import { alignClass }   from '../../tokens/tokens'
import { gapClass }     from '../../tokens/tokens'
import { justifyClass } from '../../tokens/tokens'
import { paddingClass } from '../../tokens/tokens'
import { widthClass }   from '../../tokens/tokens'

/** The element a layout piece renders: what it is to the page, never how it looks. */
export type Landmark = 'div' | 'section' | 'header' | 'footer' | 'main' | 'nav' | 'aside' | 'ul' | 'ol' | 'li' | 'form'

/** What Column and Row share: how their children sit, and how they sit in their parent. */
export type LayoutProps = {
  gap?: Space
  align?: Align
  justify?: Justify
  padding?: Space
  /** Takes the room its parent has left along the parent's direction. */
  grow?: boolean
  /** As tall as its parent: a page, a side column. */
  fill?: boolean
  width?: Width
  as?: Landmark
}

export function layoutClass({ gap, align, justify, padding, grow, fill, width }: LayoutProps): string {
  return cn(
    gap !== undefined && gapClass[gap],
    align && alignClass[align],
    justify && justifyClass[justify],
    padding !== undefined && paddingClass[padding],
    grow && 'min-h-0 min-w-0 flex-1',
    fill && 'h-full min-h-0',
    width && widthClass[width],
  )
}
