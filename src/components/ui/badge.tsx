import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "group/badge inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden border border-transparent px-3 py-2.5 text-caption font-medium whitespace-nowrap transition-all focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&>svg]:pointer-events-none [&>svg]:size-3!",
  {
    variants: {
      variant: {
        default: "rounded-xl bg-black/10 text-midnight-charcoal [a]:hover:bg-black/15",
        secondary:
          "rounded-xl bg-secondary text-secondary-foreground [a]:hover:bg-secondary/80",
        destructive:
          "badge-attention rounded-xl border [a]:hover:bg-shadow-tint-blue",
        outline:
          "rounded-xl border-border bg-transparent text-foreground [a]:hover:bg-muted",
        ghost:
          "rounded-none bg-transparent p-0 text-foreground [a]:hover:text-deep-violet",
        link: "rounded-none bg-transparent p-0 text-foreground underline-offset-4 [a]:hover:text-deep-violet [a]:hover:underline",
        pill: "rounded-xl border border-border bg-black/10 px-3 py-2.5 text-body-sm text-midnight-charcoal",
        positive: "badge-positive rounded-xl border px-2 py-0.5",
        neutral: "badge-neutral rounded-xl border px-2 py-0.5",
        pending: "badge-pending rounded-xl border px-2 py-0.5",
        attention: "badge-attention rounded-xl border px-2 py-0.5",
        info: "badge-info rounded-xl border px-2 py-0.5",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  render,
  ...props
}: useRender.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return useRender({
    defaultTagName: "span",
    props: mergeProps<"span">(
      {
        className: cn(badgeVariants({ variant }), className),
      },
      props
    ),
    render,
    state: {
      slot: "badge",
      variant,
    },
  })
}

export { Badge, badgeVariants }
