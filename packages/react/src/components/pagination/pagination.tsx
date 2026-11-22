import { cn }                         from 'cn'
import { useContext }                 from 'react'
import { useSearchParams }            from 'react-router'
// --------------------------------------------------------
import { buttonVariants }             from '../../shadcn/button'
import { Pagination as ShadcnPagination } from '../../shadcn/pagination'
import { PaginationContent }          from '../../shadcn/pagination'
import { PaginationEllipsis }         from '../../shadcn/pagination'
import { PaginationItem }             from '../../shadcn/pagination'
import { LinkComponentContext }       from '../link/link-component'
import { pagesShown }                 from './pages-shown'

type PaginationProps = {
  /** How many pages there are. */
  pages: number
  /** The query param that holds the page: `?page=3`. Page 1 leaves it out. */
  param?: string
}

/** The pages of a long list, as links: each page has its own address, with the filters it already had. */
export function Pagination({ pages, param = 'page' }: PaginationProps) {
  const Link = useContext(LinkComponentContext)
  const [params] = useSearchParams()
  const current = Math.min(Math.max(Number(params.get(param)) || 1, 1), Math.max(pages, 1))
  if (pages <= 1) return null
  const hrefOf = (page: number) => {
    const next = new URLSearchParams(params)
    if (page === 1) next.delete(param)
    else next.set(param, String(page))
    return `?${next.toString()}`
  }
  const step = (page: number, text: string) => (
    <Link href={hrefOf(page)} className={cn(buttonVariants({ variant: 'ghost' }))}>{text}</Link>
  )
  const number = (page: number) => {
    const here = page === current
    return (
      <Link href={hrefOf(page)} aria-label={`Page ${page}`} aria-current={here ? 'page' : undefined} className={cn(buttonVariants({ variant: here ? 'outline' : 'ghost', size: 'icon' }))}>
        {page}
      </Link>
    )
  }
  return (
    <ShadcnPagination>
      <PaginationContent>
        {current > 1 && <PaginationItem>{step(current - 1, 'Previous')}</PaginationItem>}
        {pagesShown(current, pages).map((page, index) => (
          <PaginationItem key={index}>{page === null ? <PaginationEllipsis /> : number(page)}</PaginationItem>
        ))}
        {current < pages && <PaginationItem>{step(current + 1, 'Next')}</PaginationItem>}
      </PaginationContent>
    </ShadcnPagination>
  )
}
