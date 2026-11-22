import type { ListStore }  from '@newt-js/client'
// --------------------------------------------------------
import { useValue }        from '../../use-value/use-value'
import { Alert }           from '../alert/alert'
import { Button }          from '../button/button'

type LoadMoreProps = {
  /** A `ListStore`, of any items. */
  list: Pick<ListStore<unknown>, 'hasMore' | 'loading' | 'error' | 'more'>
  /** What the button says. */
  label?: string
}

/** Below a list: why it failed, if it did, and a button for the next page while there is one. */
export function LoadMore({ list, label = 'Load more' }: LoadMoreProps) {
  const hasMore = useValue(list.hasMore)
  const loading = useValue(list.loading)
  const error = useValue(list.error)
  if (error !== null) return <Alert tone="bad" title={error} />
  if (!hasMore) return null
  return <Button variant="outline" loading={loading} onClick={() => void list.more()}>{label}</Button>
}
