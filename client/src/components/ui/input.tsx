import * as React from "react"

import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    // h-9 to match icon buttons and default buttons.
    return (
      <input
        type={type}
        className={cn(
          // Newsprint input: transparent field with a single heavy bottom rule,
          // monospace text, and a subtle grey fill on focus (no ring glow).
          "flex h-9 w-full border-0 border-b-2 border-[hsl(var(--foreground))] bg-transparent px-3 py-2 font-mono text-base text-foreground ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground placeholder:font-sans focus-visible:bg-[hsl(var(--secondary))] focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
