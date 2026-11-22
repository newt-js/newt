import type { ReactNode }        from 'react'
import { Fragment }              from 'react'
// --------------------------------------------------------
import { ResizableHandle }       from '../../shadcn/resizable'
import { ResizablePanel }        from '../../shadcn/resizable'
import { ResizablePanelGroup }   from '../../shadcn/resizable'

export type Panel = {
  id: string
  children: ReactNode
  /** Percent of the width (or height) it starts with. */
  size?: number
  /** Percent it never goes under. */
  minSize?: number
}

type ResizableProps = {
  panels: Panel[]
  /** `horizontal` side by side, `vertical` one over the other. */
  direction?: 'horizontal' | 'vertical'
}

/** Parts a person makes bigger or smaller by dragging between them: a list and its detail, an editor and its preview. */
export function Resizable({ panels, direction = 'horizontal' }: ResizableProps) {
  return (
    <ResizablePanelGroup orientation={direction}>
      {panels.map((panel, index) => (
        <Fragment key={panel.id}>
          {index > 0 && <ResizableHandle withHandle />}
          <ResizablePanel id={panel.id} {...(panel.size === undefined ? {} : { defaultSize: `${panel.size}%` })} {...(panel.minSize === undefined ? {} : { minSize: `${panel.minSize}%` })}>
            {panel.children}
          </ResizablePanel>
        </Fragment>
      ))}
    </ResizablePanelGroup>
  )
}
