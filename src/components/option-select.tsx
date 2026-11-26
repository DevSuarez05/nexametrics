'use client'

import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'

export interface Option {
  value: string
  label: string
}

interface OptionSelectProps {
  id?: string
  value: string
  onChange: (value: string) => void
  options: Option[]
  placeholder?: string
  className?: string
  invalid?: boolean
  describedBy?: string
  ariaLabel?: string
}

export function OptionSelect({
  id,
  value,
  onChange,
  options,
  placeholder,
  className,
  invalid,
  describedBy,
  ariaLabel,
}: OptionSelectProps) {
  return (
    <Select items={options} value={value || null} onValueChange={(next) => onChange(next === null ? '' : String(next))}>
      <SelectTrigger
        id={id}
        className={cn('w-full min-w-0', className)}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        aria-label={ariaLabel}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent alignItemWithTrigger={false}>
        <SelectGroup>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  )
}
