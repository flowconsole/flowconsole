import type { ComponentProps } from "react"

import { cn } from "@/lib/utils"

type Orientation = "horizontal" | "vertical"

interface ButtonGroupProps extends ComponentProps<"div"> {
  orientation?: Orientation
}

export function ButtonGroup({
  className,
  orientation = "horizontal",
  ...props
}: ButtonGroupProps) {
  return (
    <div
      className={cn(
        "inline-flex items-stretch",
        orientation === "vertical" && "flex-col",
        className
      )}
      role="group"
      {...props}
    />
  )
}

export function ButtonGroupText({
  className,
  ...props
}: ComponentProps<"span">) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 text-xs text-muted-foreground",
        className
      )}
      {...props}
    />
  )
}
