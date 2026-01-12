"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { ChevronDownIcon, CheckIcon } from "lucide-react"
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"

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
 * Position picker using a drawer/sheet
 * Avoids all scroll/focus issues with native selects on mobile
 */
export function PositionPicker({
  value,
  onChange,
  options,
  placeholder = "Select position",
  disabled = false,
  label,
  allowNone = false,
}: PositionPickerProps) {
  const [open, setOpen] = React.useState(false)

  const selectedOption = options.find(opt => opt.value === value)
  const displayValue = selectedOption?.label || placeholder

  const handleSelect = (optionValue: string | null) => {
    onChange(optionValue)
    setOpen(false)
  }

  return (
    <>
      <button
        type="button"
        onClick={() => !disabled && setOpen(true)}
        disabled={disabled}
        className={cn(
          "flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs",
          "focus:outline-none focus:border-ring focus:ring-[3px] focus:ring-ring/50",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "dark:bg-input/30",
          !value && "text-muted-foreground"
        )}
      >
        <span className="truncate">{displayValue}</span>
        <ChevronDownIcon className="size-4 opacity-50 flex-shrink-0" />
      </button>

      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent>
          <DrawerHeader className="text-left">
            <DrawerTitle>{label || placeholder}</DrawerTitle>
          </DrawerHeader>
          <div className="px-4 pb-6 max-h-[60vh] overflow-y-auto">
            <div className="space-y-1">
              {allowNone && (
                <button
                  type="button"
                  onClick={() => handleSelect(null)}
                  className={cn(
                    "flex w-full items-center justify-between rounded-lg px-3 py-3 text-left text-sm transition-colors",
                    "hover:bg-muted active:bg-muted/80",
                    value === null || value === undefined || value === 'none'
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-foreground"
                  )}
                >
                  <span>None</span>
                  {(value === null || value === undefined || value === 'none') && (
                    <CheckIcon className="size-4 text-primary" />
                  )}
                </button>
              )}
              {options.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleSelect(option.value)}
                  className={cn(
                    "flex w-full items-center justify-between rounded-lg px-3 py-3 text-left text-sm transition-colors",
                    "hover:bg-muted active:bg-muted/80",
                    value === option.value
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-foreground"
                  )}
                >
                  <span>{option.label}</span>
                  {value === option.value && (
                    <CheckIcon className="size-4 text-primary" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    </>
  )
}
