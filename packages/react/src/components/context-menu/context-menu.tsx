import type { ReactNode }                     from 'react'
// --------------------------------------------------------
import { ContextMenu as ShadcnContextMenu }   from '../../shadcn/context-menu'
import { ContextMenuContent }                 from '../../shadcn/context-menu'
import { ContextMenuItem }                    from '../../shadcn/context-menu'
import { ContextMenuSeparator }               from '../../shadcn/context-menu'
import { ContextMenuShortcut }                from '../../shadcn/context-menu'
import { ContextMenuTrigger }                 from '../../shadcn/context-menu'
import type { MenuItem }                      from '../menu/menu-item'
import { isSeparator }                        from '../menu/menu-item'

type ContextMenuProps = {
  items: MenuItem[]
  /** Where a right click, or a long press, opens it. */
  children: ReactNode
}

/**
 * The actions of something, on a right click. Never the only way to them: a right click is not found by
 * everyone, so the same actions are in a `Menu` too.
 */
export function ContextMenu({ items, children }: ContextMenuProps) {
  return (
    <ShadcnContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent>
        {items.map((item, index) => {
          if (isSeparator(item)) return <ContextMenuSeparator key={index} />
          const Icon = item.icon
          return (
            <ContextMenuItem key={index} variant={item.tone ?? 'default'} disabled={item.disabled} onSelect={item.onSelect}>
              {Icon && <Icon aria-hidden />}
              {item.label}
              {item.shortcut && <ContextMenuShortcut>{item.shortcut.join('')}</ContextMenuShortcut>}
            </ContextMenuItem>
          )
        })}
      </ContextMenuContent>
    </ShadcnContextMenu>
  )
}
