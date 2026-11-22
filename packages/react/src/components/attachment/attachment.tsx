import { FileIcon }               from 'lucide-react'
import { useContext }             from 'react'
// --------------------------------------------------------
import { Attachment as ShadcnAttachment } from '../../shadcn/attachment'
import { AttachmentContent }      from '../../shadcn/attachment'
import { AttachmentDescription }  from '../../shadcn/attachment'
import { AttachmentMedia }        from '../../shadcn/attachment'
import { AttachmentTitle }        from '../../shadcn/attachment'
import { LinkComponentContext }   from '../link/link-component'

type AttachmentProps = {
  /** The file's name. */
  name: string
  /** Its size or kind: "2.4 MB", "PDF". */
  description?: string
  /** `uploading` while it goes up, `error` if it did not. */
  state?: 'uploading' | 'error' | 'done'
  /** Where it opens or downloads from, once it is up. */
  href?: string
}

/** A file attached to something: a message, a ticket, a form while it uploads. */
export function Attachment({ name, description, state = 'done', href }: AttachmentProps) {
  const Link = useContext(LinkComponentContext)
  const content = (
    <AttachmentContent>
      <AttachmentTitle>{href !== undefined && state === 'done' ? <Link href={href}>{name}</Link> : name}</AttachmentTitle>
      {description !== undefined && <AttachmentDescription>{description}</AttachmentDescription>}
    </AttachmentContent>
  )
  return (
    <ShadcnAttachment state={state}>
      <AttachmentMedia><FileIcon aria-hidden /></AttachmentMedia>
      {content}
    </ShadcnAttachment>
  )
}
