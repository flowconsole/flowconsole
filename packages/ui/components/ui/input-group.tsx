"use client"

import type { ComponentProps, TextareaHTMLAttributes } from "react"

import { cn } from "@/lib/utils"
import { Button } from "./button"

export interface InputGroupProps extends ComponentProps<"div"> {}

export const InputGroup = ({ className, ...props }: InputGroupProps) => (
  <div
    className={cn(
      "flex flex-col gap-0 rounded-xl border bg-muted/30",
      className
    )}
    {...props}
  />
)

type Align = "center" | "block-start" | "block-end"

export interface InputGroupAddonProps extends ComponentProps<"div"> {
  align?: Align
}

export const InputGroupAddon = ({
  align = "center",
  className,
  ...props
}: InputGroupAddonProps) => (
  <div
    className={cn(
      "flex items-center gap-2 border-t bg-muted/40 px-3 py-2",
      align === "block-start" && "items-start",
      align === "block-end" && "items-end",
      className
    )}
    {...props}
  />
)

export type InputGroupButtonProps = ComponentProps<typeof Button>

export const InputGroupButton = ({
  className,
  size = "sm",
  variant = "ghost",
  ...props
}: InputGroupButtonProps) => (
  <Button
    className={cn("rounded-lg", className)}
    size={size}
    variant={variant}
    {...props}
  />
)

export type InputGroupTextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>

export const InputGroupTextarea = ({
  className,
  rows = 4,
  ...props
}: InputGroupTextareaProps) => (
  <textarea
    className={cn(
      "min-h-[96px] w-full resize-none border-0 bg-transparent px-4 py-3 text-sm outline-none",
      "focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0",
      className
    )}
    rows={rows}
    {...props}
  />
)
