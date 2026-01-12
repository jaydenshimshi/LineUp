"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { ChevronDownIcon } from "lucide-react"

export interface PositionPickerProps {
  value: string | null | undefined
  onChange: (value: string | null) => void
  options: { value: string; label: string }[]
  placeholder?: string
  disabled?: boolean
  label?: string
  allowNone?: boolean
}

/**
 * Simple position picker using native select
 * Works reliably on all devices without scroll issues
 */
export function PositionPicker({
  value,
  onChange,
  options,
  placeholder = "Select position",
  disabled = false,
  allowNone = false,
}: PositionPickerProps) {
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value
    if (val === '' || val === 'none') {
      onChange(null)
    } else {
      onChange(val)
    }
  }

  return (
    <div className="relative">
      <select
        value={value || (allowNone ? 'none' : '')}
        onChange={handleChange}
        disabled={disabled}
        className={cn(
          "flex h-10 w-full appearance-none items-center rounded-md border border-input bg-background px-3 py-2 pr-10 text-base shadow-sm",
          "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
          "disabled:cursor-not-allowed disabled:opacity-50",
          !value && "text-muted-foreground"
        )}
      >
        {allowNone ? (
          <option value="none">None</option>
        ) : (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDownIcon className="pointer-events-none absolute right-3 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
    </div>
  )
}
