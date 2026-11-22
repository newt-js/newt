import type { ReactNode }               from 'react'
// --------------------------------------------------------
import { Accordion as ShadcnAccordion } from '../../shadcn/accordion'
import { AccordionContent }             from '../../shadcn/accordion'
import { AccordionItem }                from '../../shadcn/accordion'
import { AccordionTrigger }             from '../../shadcn/accordion'

export type AccordionSection = {
  value: string
  title: ReactNode
  children: ReactNode
}

type AccordionProps = {
  sections: AccordionSection[]
  /** Several open at once; by default, opening one closes the other. */
  multiple?: boolean
}

/** Sections of which only the titles show until opened: questions and answers, settings by group. */
export function Accordion({ sections, multiple = false }: AccordionProps) {
  const items = sections.map(section => (
    <AccordionItem key={section.value} value={section.value}>
      <AccordionTrigger>{section.title}</AccordionTrigger>
      <AccordionContent>{section.children}</AccordionContent>
    </AccordionItem>
  ))
  if (multiple) return <ShadcnAccordion type="multiple">{items}</ShadcnAccordion>
  return <ShadcnAccordion type="single" collapsible>{items}</ShadcnAccordion>
}
