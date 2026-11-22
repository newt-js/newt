import type { ReactNode }             from 'react'
// --------------------------------------------------------
import { Carousel as ShadcnCarousel } from '../../shadcn/carousel'
import { CarouselContent }            from '../../shadcn/carousel'
import { CarouselItem }               from '../../shadcn/carousel'
import { CarouselNext }               from '../../shadcn/carousel'
import { CarouselPrevious }           from '../../shadcn/carousel'

type CarouselProps = {
  /** What it shows, read by a screen reader: "Photos of the flat". */
  label: string
  /** One slide each. */
  slides: ReactNode[]
}

/** Slides, one after another, moved with its arrows or by dragging: photos, steps. */
export function Carousel({ label, slides }: CarouselProps) {
  return (
    <ShadcnCarousel aria-label={label} className="mx-12">
      <CarouselContent>
        {slides.map((slide, index) => <CarouselItem key={index}>{slide}</CarouselItem>)}
      </CarouselContent>
      <CarouselPrevious />
      <CarouselNext />
    </ShadcnCarousel>
  )
}
