import type { LucideIcon } from 'lucide-react'

/** One action of a menu. */
export type MenuAction = {
  label: string
  onSelect: () => void
  /** `destructive` for what deletes or cannot be undone. */
  tone?: 'default' | 'destructive'
  disabled?: boolean
  icon?: LucideIcon
  /** The keys that do it too, as shown: `['⌘', 'D']`. */
  shortcut?: string[]
}

/** What a menu lists: actions, and lines between groups of them. */
export type MenuItem = MenuAction | { separator: true }

export const isSeparator = (item: MenuItem): item is { separator: true } => 'separator' in item
