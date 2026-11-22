import type { ReactNode }        from 'react'
// --------------------------------------------------------
import { Tabs as ShadcnTabs }    from '../../shadcn/tabs'
import { TabsContent }           from '../../shadcn/tabs'
import { TabsList }              from '../../shadcn/tabs'
import { TabsTrigger }           from '../../shadcn/tabs'
import { useQueryParam }         from '../../router/use-query-param'

export type Tab = {
  /** What the address says: `?tab=invoices`. A word a person reads. */
  value: string
  label: string
  /** How many there are inside, beside the label. */
  count?: number
}

type TabsProps = {
  tabs: Tab[]
  /** The query param that holds the open tab. The first tab leaves it out, so its address stays clean. */
  param?: string
  /** The accessible name of the tabs. */
  label: string
  /** One `TabsPanel` per tab. */
  children: ReactNode
}

/**
 * The parts of one page, one at a time: a client's overview, invoices and notes. The open tab is in the address,
 * so it can be shared and gone back to. For views of the same things (list or grid), a `ToggleGroup`.
 */
export function Tabs({ tabs, param = 'tab', label, children }: TabsProps) {
  const [chosen, choose] = useQueryParam(param)
  const first = tabs[0]?.value ?? ''
  const open = tabs.some(tab => tab.value === chosen) ? chosen as string : first
  return (
    <ShadcnTabs value={open} onValueChange={value => choose(value === first ? null : value)}>
      <TabsList aria-label={label}>
        {tabs.map(tab => (
          <TabsTrigger key={tab.value} value={tab.value}>
            {tab.label}
            {tab.count !== undefined && <span className="text-muted-foreground tabular-nums">{tab.count}</span>}
          </TabsTrigger>
        ))}
      </TabsList>
      {children}
    </ShadcnTabs>
  )
}

/** What one tab shows, only while it is open. */
export function TabsPanel({ value, children }: { value: string, children: ReactNode }) {
  return <TabsContent value={value}>{children}</TabsContent>
}
