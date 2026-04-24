
import { ThemeProvider } from "@flowconsole/web";
import type { ReactNode } from "react";

interface FlowConsoleThemeProviderProps {
  children: ReactNode;
}

export function FlowConsoleThemeProvider({
  children,
}: FlowConsoleThemeProviderProps) {
  return <ThemeProvider>{children}</ThemeProvider>;
}
