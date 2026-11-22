import { useCallback }     from 'react'
import { useSearchParams } from 'react-router'

/**
 * One query param of the address, and how to change it: `useQueryParam('status')` on `/clients?status=active`
 * is `'active'`. What a person chose to look at (a tab, a filter, a page, a search) lives in the address, so it
 * can be shared, kept as a bookmark and gone back to. `null`, or an empty value, takes the param out.
 */
export function useQueryParam(name: string): [string | null, (value: string | null) => void] {
  const [params, setParams] = useSearchParams()
  const set = useCallback((value: string | null) => {
    setParams(current => {
      const next = new URLSearchParams(current)
      if (value === null || value === '') next.delete(name)
      else next.set(name, value)
      return next
    })
  }, [name, setParams])
  return [params.get(name), set]
}
