import { CalendarIcon }      from 'lucide-react'
import { useState }          from 'react'
// --------------------------------------------------------
import { Button }            from '../../shadcn/button'
import { Calendar }          from '../../shadcn/calendar'
import { Popover }           from '../../shadcn/popover'
import { PopoverContent }    from '../../shadcn/popover'
import { PopoverTrigger }    from '../../shadcn/popover'
import { useControlProps }   from '../field/field-control'

type DatePickerProps = {
  /** A day as the API writes it, `2026-11-22`, or `null` for none. */
  value: string | null
  onChange: (value: string | null) => void
  placeholder?: string
  disabled?: boolean
  /** Marks the value as wrong. Inside a `Field`, its `error` does it. */
  invalid?: boolean
  /** The accessible name, for a date outside a `Field`. */
  label?: string
}

const dayOf = (value: string) => new Date(`${value}T00:00:00`)

const written = (day: Date) => `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`

/** A day, from a calendar. */
export function DatePicker({ value, onChange, placeholder = 'Pick a day', disabled, invalid, label }: DatePickerProps) {
  const [open, setOpen] = useState(false)
  const control = useControlProps(invalid, label)
  const day = value === null ? undefined : dayOf(value)
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button {...control} variant="outline" disabled={disabled} className="w-full justify-start font-normal">
          <CalendarIcon />
          {day ? day.toLocaleDateString() : <span className="text-muted-foreground">{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar mode="single" selected={day} defaultMonth={day} onSelect={picked => {
          onChange(picked ? written(picked) : null)
          setOpen(false)
        }} />
      </PopoverContent>
    </Popover>
  )
}
