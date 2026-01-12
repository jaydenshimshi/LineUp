"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { ChevronDownIcon } from "lucide-react"

export interface NativeSelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  options: { value: string; label: string }[]
  placeholder?: string
}

/**
 * Native HTML select component for mobile
 * Uses native OS select behavior which works better on touch devices
 * Prevents page scroll/jump when select is focused on mobile
 */
const NativeSelect = React.forwardRef<HTMLSelectElement, NativeSelectProps>(
  ({ className, options, placeholder, value, onFocus, ...props }, ref) => {
    const internalRef = React.useRef<HTMLSelectElement>(null)
    const selectRef = (ref as React.RefObject<HTMLSelectElement>) || internalRef

    // Prevent scroll jump on focus by storing and restoring scroll position
    const handleFocus = React.useCallback((e: React.FocusEvent<HTMLSelectElement>) => {
      // Store current scroll position
      const scrollY = window.scrollY
      const scrollX = window.scrollX

      // Use requestAnimationFrame to restore scroll position after browser auto-scroll
      requestAnimationFrame(() => {
        // Only restore if we scrolled away
        if (Math.abs(window.scrollY - scrollY) > 50) {
          window.scrollTo({
            top: scrollY,
            left: scrollX,
            behavior: 'instant'
          })
        }
      })

      // Call the original onFocus if provided
      onFocus?.(e)
    }, [onFocus])

    return (
      <div className="relative">
        <select
          ref={selectRef}
          value={value}
          onFocus={handleFocus}
          className={cn(
            "flex h-9 w-full appearance-none items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 pr-8 text-sm shadow-xs outline-none focus:border-ring focus:ring-[3px] focus:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50",
            "dark:bg-input/30",
            // Prevent iOS zoom on focus
            "text-[16px] sm:text-sm",
            // Add scroll margin to prevent harsh jumps
            "scroll-mt-20",
            !value && "text-muted-foreground",
            className
          )}
          {...props}
        >
          {placeholder && (
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
        <ChevronDownIcon className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 opacity-50" />
      </div>
    )
  }
)
NativeSelect.displayName = "NativeSelect"

export { NativeSelect }
