import { Menubar as ShadcnMenubar } from '../../shadcn/menubar'
import { MenubarContent }           from '../../shadcn/menubar'
import { MenubarItem }              from '../../shadcn/menubar'
import { MenubarMenu }              from '../../shadcn/menubar'
import { MenubarSeparator }         from '../../shadcn/menubar'
import { MenubarShortcut }          from '../../shadcn/menubar'
import { MenubarTrigger }           from '../../shadcn/menubar'
import type { MenuItem }            from '../menu/menu-item'
import { isSeparator }              from '../menu/menu-item'

type MenubarProps = {
  /** Each menu by its name: File, Edit, View… */
  menus: { label: string, items: MenuItem[] }[]
}

/** The menus of a tool, as a desktop program has them: for an editor, not for a page. */
export function Menubar({ menus }: MenubarProps) {
  return (
    <ShadcnMenubar>
      {menus.map(menu => (
        <MenubarMenu key={menu.label}>
          <MenubarTrigger>{menu.label}</MenubarTrigger>
          <MenubarContent>
            {menu.items.map((item, index) => {
              if (isSeparator(item)) return <MenubarSeparator key={index} />
              return (
                <MenubarItem key={index} variant={item.tone ?? 'default'} disabled={item.disabled} onSelect={item.onSelect}>
                  {item.label}
                  {item.shortcut && <MenubarShortcut>{item.shortcut.join('')}</MenubarShortcut>}
                </MenubarItem>
              )
            })}
          </MenubarContent>
        </MenubarMenu>
      ))}
    </ShadcnMenubar>
  )
}
