import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

// Newsprint buttons: uppercase sans labels, sharp corners, and snappy
// black/white color inversion on hover instead of soft elevation.
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap border font-sans text-xs font-semibold uppercase tracking-widest transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground border-foreground hover:bg-background hover:text-foreground",
        destructive:
          "bg-destructive text-destructive-foreground border-destructive hover:bg-background hover:text-destructive",
        outline:
          "border-foreground bg-transparent text-foreground hover:bg-foreground hover:text-background",
        secondary:
          "bg-secondary text-secondary-foreground border-foreground hover:bg-foreground hover:text-background",
        // Transparent border keeps sizing stable if a border is toggled on later.
        ghost:
          "border-transparent hover:bg-secondary hover:text-foreground",
        link:
          "border-transparent text-foreground underline-offset-4 decoration-2 decoration-[hsl(var(--accent))] hover:underline tracking-normal normal-case",
      },
      // Min-heights (not fixed) so buttons expand gracefully with more content.
      size: {
        default: "min-h-9 px-4 py-2",
        sm: "min-h-8 px-3",
        lg: "min-h-11 px-8 text-sm",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  },
)
Button.displayName = "Button"

export { Button, buttonVariants }
