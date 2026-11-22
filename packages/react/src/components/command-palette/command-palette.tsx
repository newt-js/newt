import { CommandDialog }      from '../../shadcn/command'
import { CommandEmpty }       from '../../shadcn/command'
import { CommandGroup }       from '../../shadcn/command'
import { CommandInput }       from '../../shadcn/command'
import { CommandItem }        from '../../shadcn/command'
import { CommandList }        from '../../shadcn/command'
import { CommandShortcut }    from '../../shadcn/command'
import type { MenuAction }    from '../menu/menu-item'

type CommandPaletteProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** The actions, by group: Go to, Create… */
  groups: { label: string, actions: MenuAction[] }[]
  placeholder?: string
  empty?: string
}

/** Every action of the app, found by typing: what ⌘K opens. Choosing one runs it and closes. */
export function CommandPalette({ open, onOpenChange, groups, placeholder = 'Type a command or search…', empty = 'Nothing matches' }: CommandPaletteProps) {
  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder={placeholder} />
      <CommandList>
        <CommandEmpty>{empty}</CommandEmpty>
        {groups.map(group => (
          <CommandGroup key={group.label} heading={group.label}>
            {group.actions.map(action => {
              const Icon = action.icon
              return (
                <CommandItem key={action.label} disabled={action.disabled} onSelect={() => {
                  onOpenChange(false)
                  action.onSelect()
                }}>
                  {Icon && <Icon aria-hidden />}
                  {action.label}
                  {action.shortcut && <CommandShortcut>{action.shortcut.join('')}</CommandShortcut>}
                </CommandItem>
              )
            })}
          </CommandGroup>
        ))}
      </CommandList>
    </CommandDialog>
  )
}
