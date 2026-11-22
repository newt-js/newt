import { Slider as ShadcnSlider } from '../../shadcn/slider'
import { useControlProps }        from '../field/field-control'

type SliderProps = {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  step?: number
  disabled?: boolean
  /** The accessible name, for a slider outside a `Field`. */
  label?: string
}

/** A number in a range, chosen by sliding. */
export function Slider({ value, onChange, min = 0, max = 100, step = 1, disabled, label }: SliderProps) {
  const { id, ...control } = useControlProps(undefined, label)
  return <ShadcnSlider {...control} id={id} value={[value]} min={min} max={max} step={step} disabled={disabled} onValueChange={([next]) => onChange(next ?? value)} />
}
