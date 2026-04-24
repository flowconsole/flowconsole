import { buttonVariants } from "@flowconsole/ui/components/ui/button";
import { FlowConsoleLogo } from "@flowconsole/ui/components/ui/FlowConsoleLogo";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { buildWebsiteUrl } from "@/lib/config/urls";
import { cn } from "@/lib/utils";
import { UserAuthForm } from "@/components/forms/user-auth-form";

export function RegisterPage() {
  const { t } = useTranslation("auth");

  return (
    <div className="container grid h-screen w-screen flex-col items-center justify-center lg:max-w-none lg:grid-cols-2 lg:px-0">
      <Link
        to="/login"
        className={cn(
          buttonVariants({ variant: "ghost" }),
          "absolute right-4 top-4 md:right-8 md:top-8",
        )}
      >
        {t("loginPageTitle")}
      </Link>
      <div className="hidden h-full bg-muted lg:block" />
      <div className="lg:p-8">
        <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
          <div className="flex flex-col space-y-2 text-center">
            <div className="mx-auto">
              <FlowConsoleLogo />
            </div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {t("registerPageTitle")}
            </h1>
            <p className="text-sm text-muted-foreground">
              {t("enterEmailToCreate")}
            </p>
          </div>
          <UserAuthForm type="register" />
          <p className="px-8 text-center text-sm text-muted-foreground">
            {t("byContinuing")}{" "}
            <a
              href={buildWebsiteUrl("/pages/terms")}
              className="hover:text-brand underline underline-offset-4"
            >
              {t("termsOfService")}
            </a>{" "}
            {t("and")}{" "}
            <a
              href={buildWebsiteUrl("/pages/privacy")}
              className="hover:text-brand underline underline-offset-4"
            >
              {t("privacyPolicy")}
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
