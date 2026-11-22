import type { ReactNode }    from 'react'
// --------------------------------------------------------
import { Bubble }            from '../../shadcn/bubble'
import { BubbleContent }     from '../../shadcn/bubble'
import { Message }           from '../../shadcn/message'
import { MessageAvatar }     from '../../shadcn/message'
import { MessageContent }    from '../../shadcn/message'
import { MessageFooter }     from '../../shadcn/message'
import { MessageHeader }     from '../../shadcn/message'
import { Avatar }            from '../avatar/avatar'

type ChatMessageProps = {
  /** Who wrote it. */
  author: { name: string, picture?: string | null }
  /** `mine` for what the person reading wrote: it goes on the other side, in the brand's color. */
  mine?: boolean
  /** When, as it should read: "10:42", "yesterday". */
  time?: string
  /** Below it: `Attachment`s, reactions. */
  footer?: ReactNode
  children: ReactNode
}

/** One message of a conversation, in its bubble. Inside a `ChatThread`. */
export function ChatMessage({ author, mine = false, time, footer, children }: ChatMessageProps) {
  return (
    <Message align={mine ? 'end' : 'start'}>
      <MessageAvatar><Avatar name={author.name} src={author.picture ?? null} size={8} /></MessageAvatar>
      <MessageContent>
        <MessageHeader className="gap-2">{author.name}{time !== undefined && <span className="text-muted-foreground">{time}</span>}</MessageHeader>
        <Bubble variant={mine ? 'default' : 'muted'} align={mine ? 'end' : 'start'}>
          <BubbleContent>{children}</BubbleContent>
        </Bubble>
        {footer !== undefined && <MessageFooter>{footer}</MessageFooter>}
      </MessageContent>
    </Message>
  )
}
