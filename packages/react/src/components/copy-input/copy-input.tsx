import { CheckIcon }         from 'lucide-react'
import { CopyIcon }          from 'lucide-react'
import { useEffect }         from 'react'
import { useState }          from 'react'
// --------------------------------------------------------
import { InputGroup }        from '../../shadcn/input-group'
import { InputGroupAddon }   from '../../shadcn/input-group'
import { InputGroupButton }  from '../../shadcn/input-group'
import { InputGroupInput }   from '../../shadcn/input-group'
import { useControlProps }   from '../field/field-control'
import { toast }             from '../toast/toast'

type CopyInputProps = {
  value: string
  /** What it is, for the toast and the button: `Client secret copied`. */
  what?: string
  /** The accessible name, for one outside a `Field`. */
  label?: string
}

/**
 * A value to take away, as an id or a secret: read only, in monospace, all of it selected on focus, and copied by
 * its button. Longer than the field, it scrolls inside it.
 */
export function CopyInput({ value, what = 'Value', label }: CopyInputProps) {
  const control = useControlProps(undefined, label)
  const [copied, setCopied] = useState(false)
  useEffect(() => {
    if (!copied) return
    const timer = setTimeout(() => setCopied(false), 1500)
    return () => clearTimeout(timer)
  }, [copied])
  const copy = () => {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true)
      toast.success(`${what} copied`)
    }, () => toast.error(`${what} could not be copied`))
  }
  return (
    <InputGroup>
      <InputGroupInput {...control} value={value} readOnly className="font-mono" onFocus={event => event.currentTarget.select()} />
      <InputGroupAddon align="inline-end">
        <InputGroupButton size="icon-xs" aria-label={`Copy ${what.toLowerCase()}`} onClick={copy}>
          {copied ? <CheckIcon /> : <CopyIcon />}
        </InputGroupButton>
      </InputGroupAddon>
    </InputGroup>
  )
}
