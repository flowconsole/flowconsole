import { Button } from "@flowconsole/ui/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@flowconsole/ui/components/ui/tooltip";
import { Languages } from "lucide-react";
import { useTranslation } from "react-i18next";

const LOCALES = ["en", "ru"] as const;

export function LocaleToggle() {
  const { i18n } = useTranslation();

  const currentIndex = LOCALES.indexOf(
    i18n.language as (typeof LOCALES)[number],
  );
  const nextLocale = LOCALES[(currentIndex + 1) % LOCALES.length];

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="size-8 px-0 uppercase"
          onClick={() => void i18n.changeLanguage(nextLocale)}
          data-testid="locale-toggle"
        >
          <Languages className="size-4" />
          <span className="sr-only">
            Switch to {nextLocale}
          </span>
        </Button>
      </TooltipTrigger>
      <TooltipContent side="top">
        {i18n.language.toUpperCase()}
      </TooltipContent>
    </Tooltip>
  );
}
