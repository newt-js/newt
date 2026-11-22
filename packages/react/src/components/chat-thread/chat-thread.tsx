import type { ReactNode }             from 'react'
// --------------------------------------------------------
import { MessageScroller }            from '../../shadcn/message-scroller'
import { MessageScrollerButton }      from '../../shadcn/message-scroller'
import { MessageScrollerContent }     from '../../shadcn/message-scroller'
import { MessageScrollerProvider }    from '../../shadcn/message-scroller'
import { MessageScrollerViewport }    from '../../shadcn/message-scroller'

type ChatThreadProps = {
  /** What it is, read by a screen reader: "Conversation with Ana". */
  label: string
  /** `ChatMessage`s, oldest first. */
  children: ReactNode
}

/**
 * A conversation: it fills its place, scrolls on its own and stays at the newest message as they arrive, unless
 * the person scrolled up to read; then a button takes them back down.
 */
export function ChatThread({ label, children }: ChatThreadProps) {
  return (
    <MessageScrollerProvider>
      <MessageScroller aria-label={label}>
        <MessageScrollerViewport>
          <MessageScrollerContent>{children}</MessageScrollerContent>
        </MessageScrollerViewport>
        <MessageScrollerButton />
      </MessageScroller>
    </MessageScrollerProvider>
  )
}
