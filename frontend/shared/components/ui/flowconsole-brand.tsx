import { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";
import { FlowConsoleLogo } from "./FlowConsoleLogo";

interface FlowConsoleBrandProps extends HTMLAttributes<HTMLDivElement> {
  showText?: boolean;
}

export function FlowConsoleBrand({
  showText = true,
  className,
  ...props
}: FlowConsoleBrandProps) {
  return (
    <div className={cn("flex items-center gap-2", className)} {...props}>
       <FlowConsoleLogo/>
      {showText ? (
        <span className="text-lg font-semibold leading-none">FlowConsole</span>
      ) : null}
    </div>
  );
}
