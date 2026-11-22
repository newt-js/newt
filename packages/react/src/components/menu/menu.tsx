import type { ReactNode }                         from 'react'
// --------------------------------------------------------
import { DropdownMenu as ShadcnDropdownMenu }     from '../../shadcn/dropdown-menu'
import { DropdownMenuContent }                    from '../../shadcn/dropdown-menu'
import { DropdownMenuItem }                       from '../../shadcn/dropdown-menu'
import { DropdownMenuSeparator }                  from '../../shadcn/dropdown-menu'
import { DropdownMenuShortcut }                   from '../../shadcn/dropdown-menu'
import { DropdownMenuTrigger }                    from '../../shadcn/dropdown-menu'
import type { MenuItem }                          from './menu-item'
import { isSeparator }                            from './menu-item'

type MenuProps = {
  /** What opens it: one `Button`. */
  trigger: ReactNode
  items: MenuItem[]
  /** The menu's accessible name. */
  label: string
  align?: 'start' | 'end'
}

/** Actions that open from a button: what can be done with a row, a card, a page. Arrows move, Escape closes. */
export function Menu({ trigger, items, label, align = 'end' }: MenuProps) {
  return (
    <ShadcnDropdownMenu>
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent align={align} aria-label={label}>
        {items.map((item, index) => {
          if (isSeparator(item)) return <DropdownMenuSeparator key={index} />
          const Icon = item.icon
          return (
            <DropdownMenuItem key={index} variant={item.tone ?? 'default'} disabled={item.disabled} onSelect={item.onSelect}>
              {Icon && <Icon aria-hidden />}
              {item.label}
              {item.shortcut && <DropdownMenuShortcut>{item.shortcut.join('')}</DropdownMenuShortcut>}
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </ShadcnDropdownMenu>
  )
}
