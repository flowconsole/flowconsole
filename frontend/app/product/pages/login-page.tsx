import { Icons } from "@flowconsole/ui/components/shared/icons";
import { buttonVariants } from "@flowconsole/ui/components/ui/button";
import { FlowConsoleLogo } from "@flowconsole/ui/components/ui/FlowConsoleLogo";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { buildWebsiteUrl } from "@/lib/config/urls";
import { cn } from "@/lib/utils";
import { UserAuthForm } from "@/components/forms/user-auth-form";

export function LoginPage() {
  const { t } = useTranslation("auth");
  const { t: tNav } = useTranslation("nav");

  return (
    <div className="container flex h-screen w-screen flex-col items-center justify-center">
      <a
        href={buildWebsiteUrl("/")}
        className={cn(
          buttonVariants({ variant: "outline", size: "sm" }),
          "absolute left-4 top-4 md:left-8 md:top-8",
        )}
      >
        <Icons.chevronLeft className="mr-2 size-4" />
        {tNav("back")}
      </a>
      <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
        <div className="flex flex-col space-y-2 text-center">
          <div className="mx-auto">
            <FlowConsoleLogo />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {t("welcomeBack")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t("enterEmailToSignIn")}
          </p>
        </div>
        <UserAuthForm />
        <p className="px-8 text-center text-sm text-muted-foreground">
          <Link
            to="/register"
            className="hover:text-brand underline underline-offset-4"
          >
            {t("dontHaveAccount")} {t("signUpLink")}
          </Link>
        </p>
      </div>
    </div>
  );
}
