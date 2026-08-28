import * as React from "react"

import { cn } from "@/lib/utils"

function shouldSelectInputValue(
  type: React.ComponentProps<"input">["type"],
  inputMode: React.ComponentProps<"input">["inputMode"]
) {
  return type === "number" || inputMode === "numeric" || inputMode === "decimal"
}

function selectInputValue(input: HTMLInputElement) {
  if (input.disabled || input.readOnly || input.value === "") return
  requestAnimationFrame(() => input.select())
}

function Input({
  className,
  inputMode,
  onFocus,
  onMouseUp,
  type,
  ...props
}: React.ComponentProps<"input">) {
  const selectOnFocus = shouldSelectInputValue(type, inputMode)

  return (
    <input
      type={type}
      inputMode={inputMode}
      data-slot="input"
      data-select-on-focus={selectOnFocus ? true : undefined}
      className={cn(
        "h-9 w-full min-w-0 rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none selection:bg-primary selection:text-primary-foreground file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm dark:bg-input/30",
        "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
        "aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40",
        className
      )}
      onFocus={(event) => {
        onFocus?.(event)
        if (selectOnFocus) selectInputValue(event.currentTarget)
      }}
      onMouseUp={(event) => {
        onMouseUp?.(event)
        if (!selectOnFocus) return
        event.preventDefault()
        selectInputValue(event.currentTarget)
      }}
      {...props}
    />
  )
}

export { Input }
