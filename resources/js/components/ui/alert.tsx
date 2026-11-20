import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const alertVariants = cva(
  "relative w-full rounded-[14px] border px-4 py-3.5 text-sm grid has-[>svg]:grid-cols-[calc(var(--spacing)*5)_1fr] grid-cols-[0_1fr] has-[>svg]:gap-x-3 gap-y-0.5 items-start [&>svg]:size-5 [&>svg]:text-current",
  {
    variants: {
      variant: {
        default: "border-border bg-surface text-ink",
        destructive:
          "border-transparent bg-danger-soft text-danger-ink *:data-[slot=alert-description]:text-danger-ink",
        danger:
          "border-transparent bg-danger-soft text-danger-ink *:data-[slot=alert-description]:text-danger-ink",
        success:
          "border-transparent bg-success-soft text-success-ink *:data-[slot=alert-description]:text-success-ink",
        warning:
          "border-transparent bg-warning-soft text-warning-ink *:data-[slot=alert-description]:text-warning-ink",
        info: "border-transparent bg-info-soft text-info-ink *:data-[slot=alert-description]:text-info-ink",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Alert({
  className,
  variant,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof alertVariants>) {
  return (
    <div
      data-slot="alert"
      role="alert"
      className={cn(alertVariants({ variant }), className)}
      {...props}
    />
  )
}

function AlertTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-title"
      className={cn(
        "col-start-2 line-clamp-1 min-h-5 font-bold",
        className
      )}
      {...props}
    />
  )
}

function AlertDescription({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-description"
      className={cn(
        "text-ink-muted col-start-2 grid justify-items-start gap-1 text-sm [&_p]:leading-relaxed",
        className
      )}
      {...props}
    />
  )
}

export { Alert, AlertTitle, AlertDescription }
