"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { ChevronDownIcon, Check } from "lucide-react"

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
 * Modern position picker with native select for reliability
 * Features smooth animations and modern styling while maintaining
 * mobile-friendly behavior (scroll prevention, iOS zoom prevention)
 */
export function PositionPicker({
  value,
  onChange,
  options,
  placeholder = "Select position",
  disabled = false,
  allowNone = false,
}: PositionPickerProps) {
  const [isFocused, setIsFocused] = React.useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value
    if (val === '' || val === 'none') {
      onChange(null)
    } else {
      onChange(val)
    }
  }

  // Prevent scroll jump on focus by storing and restoring scroll position
  const handleFocus = React.useCallback(() => {
    setIsFocused(true)
    const scrollY = window.scrollY
    const scrollX = window.scrollX

    requestAnimationFrame(() => {
      if (Math.abs(window.scrollY - scrollY) > 50) {
        window.scrollTo({
          top: scrollY,
          left: scrollX,
          behavior: 'instant'
        })
      }
    })
  }, [])

  const handleBlur = React.useCallback(() => {
    setIsFocused(false)
  }, [])

  // Get the current selected option label for display
  const selectedOption = options.find(opt => opt.value === value)
  const displayValue = selectedOption?.label || (allowNone && value === null ? 'None' : '')

  return (
    <div className="relative w-full">
      {/* Modern styled wrapper */}
      <div
        className={cn(
          "relative overflow-hidden rounded-xl transition-all duration-200",
          // Border and shadow
          "border-2",
          isFocused
            ? "border-primary shadow-lg shadow-primary/10"
            : value
              ? "border-primary/30 shadow-md"
              : "border-input shadow-sm",
          // Background gradient
          value
            ? "bg-gradient-to-r from-primary/5 to-primary/10"
            : "bg-background",
          // Disabled state
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        {/* Selected value indicator */}
        {value && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-2 pointer-events-none">
            <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/20">
              <Check className="w-3.5 h-3.5 text-primary" />
            </div>
          </div>
        )}

        {/* Native select - hidden but functional */}
        <select
          value={value || (allowNone ? 'none' : '')}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          disabled={disabled}
          className={cn(
            "relative z-10 w-full h-12 appearance-none bg-transparent cursor-pointer",
            "outline-none border-none",
            // Padding adjusts based on whether there's a value (to make room for check icon)
            value ? "pl-12 pr-10" : "pl-4 pr-10",
            // Typography
            "text-[16px] sm:text-sm font-medium",
            // Colors
            value ? "text-foreground" : "text-muted-foreground",
            // Disabled
            "disabled:cursor-not-allowed",
            // Scroll margin
            "scroll-mt-20"
          )}
          aria-label={placeholder}
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

        {/* Chevron icon with animation */}
        <div
          className={cn(
            "absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none transition-transform duration-200",
            isFocused && "rotate-180"
          )}
        >
          <div className={cn(
            "flex items-center justify-center w-6 h-6 rounded-full transition-colors duration-200",
            isFocused ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
          )}>
            <ChevronDownIcon className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Subtle hint text when no value selected */}
      {!value && !allowNone && (
        <p className="mt-1.5 text-xs text-muted-foreground/70 pl-1">
          Tap to select
        </p>
      )}
    </div>
  )
}
