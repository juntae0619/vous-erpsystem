import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center border border-transparent bg-clip-padding text-body-sm font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "rounded-[var(--radius-buttons)] bg-primary text-primary-foreground shadow-btn [a]:hover:bg-midnight-charcoal",
        outline:
          "rounded-[var(--radius-outline)] border-border bg-transparent text-foreground hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground",
        secondary:
          "rounded-[var(--radius-buttons)] bg-secondary text-secondary-foreground hover:bg-secondary/80 aria-expanded:bg-secondary aria-expanded:text-secondary-foreground",
        ghost:
          "rounded-sm bg-transparent text-foreground hover:bg-transparent hover:text-deep-violet hover:underline hover:underline-offset-2 aria-expanded:text-deep-violet",
        pill:
          "rounded-[var(--radius-pills)] bg-transparent text-smoke-gray hover:text-foreground hover:bg-black/5",
        destructive:
          "rounded-[var(--radius-buttons)] bg-hint-of-sky text-rich-plum hover:bg-shadow-tint-blue focus-visible:border-vivid-purple focus-visible:ring-vivid-purple/20",
        link: "text-foreground underline-offset-4 hover:text-deep-violet hover:underline",
      },
      size: {
        default:
          "h-9 gap-1.5 px-3 has-data-[icon=inline-end]:pr-2.5 has-data-[icon=inline-start]:pl-2.5",
        xs: "h-6 gap-1 rounded-sm px-2 text-caption in-data-[slot=button-group]:rounded-[var(--radius-buttons)] has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8 gap-1 rounded-[var(--radius-buttons)] px-2.5 text-caption in-data-[slot=button-group]:rounded-[var(--radius-buttons)] has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-10 gap-1.5 px-4 has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3",
        icon: "size-9 rounded-[var(--radius-buttons)]",
        "icon-xs":
          "size-6 rounded-sm in-data-[slot=button-group]:rounded-[var(--radius-buttons)] [&_svg:not([class*='size-'])]:size-3",
        "icon-sm":
          "size-8 rounded-[var(--radius-buttons)] in-data-[slot=button-group]:rounded-[var(--radius-buttons)]",
        "icon-lg": "size-10 rounded-[var(--radius-buttons)]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  )
}

export { Button, buttonVariants }
