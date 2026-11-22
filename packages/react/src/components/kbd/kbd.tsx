import { Kbd as ShadcnKbd } from '../../shadcn/kbd'
import { KbdGroup }          from '../../shadcn/kbd'

type KbdProps = {
  /** The keys pressed together: `['⌘', 'K']`. */
  keys: string[]
}

/** A shortcut, as the keys show it. */
export function Kbd({ keys }: KbdProps) {
  return <KbdGroup>{keys.map(key => <ShadcnKbd key={key}>{key}</ShadcnKbd>)}</KbdGroup>
}
