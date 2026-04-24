
import { LogIn, ShieldOff, Clock, AlertTriangle } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { Button, buttonVariants } from "@flowconsole/ui/components/ui/button";
import { routes } from "@/lib/routes";

/**
 * Operator-cockpit-styled state panel — centered, monochrome, icon-led.
 * Used for all auth state pages (sign-in prompt, expired, forbidden).
 */
function AuthStatePanel({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <div className="flex max-w-md flex-col items-center gap-6 text-center">
        <div className="flex size-16 items-center justify-center rounded-full border-2 border-muted bg-muted/50">
          <Icon className="size-7 text-muted-foreground" />
        </div>
        <div className="flex flex-col gap-2">
          <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
        </div>
        {children && <div className="flex flex-col gap-3">{children}</div>}
      </div>
    </div>
  );
}

/**
 * Shown to anonymous users in protected areas — prompts sign-in.
 */
export function SignInPrompt() {
  const { t } = useTranslation("authStates");

  return (
    <AuthStatePanel
      icon={LogIn}
      title={t("signInRequired")}
      description={t("signInRequiredDescription")}
    >
      <Link
        href={routes.login}
        className={cn(buttonVariants({ size: "lg" }), "gap-2")}
      >
        <LogIn className="size-4" />
        {t("signIn")}
      </Link>
    </AuthStatePanel>
  );
}

/**
 * Shown when a session has expired and needs re-authentication.
 */
export function SessionExpired({
  onSignIn,
}: {
  onSignIn?: () => void;
}) {
  const { t } = useTranslation("authStates");

  return (
    <AuthStatePanel
      icon={Clock}
      title={t("sessionExpired")}
      description={t("sessionExpiredDescription")}
    >
      {onSignIn ? (
        <Button size="lg" onClick={onSignIn} className="gap-2">
          <LogIn className="size-4" />
          {t("signInAgain")}
        </Button>
      ) : (
        <Link
          href={routes.login}
          className={cn(buttonVariants({ size: "lg" }), "gap-2")}
        >
          <LogIn className="size-4" />
          {t("signInAgain")}
        </Link>
      )}
    </AuthStatePanel>
  );
}

/**
 * Shown when the user is authenticated but lacks permission for the resource.
 */
export function ForbiddenState({
  resource,
}: {
  resource?: string;
}) {
  const { t } = useTranslation("authStates");

  return (
    <AuthStatePanel
      icon={ShieldOff}
      title={t("forbidden")}
      description={
        resource
          ? t("forbiddenResourceDescription", { resource })
          : t("forbiddenDescription")
      }
    >
      <Link
        href={routes.dashboard}
        className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
      >
        {t("backToDashboard")}
      </Link>
    </AuthStatePanel>
  );
}

/**
 * Shown when an auth-related error occurs (e.g., failed token refresh).
 */
export function AuthError({
  onRetry,
}: {
  onRetry?: () => void;
}) {
  const { t } = useTranslation("authStates");

  return (
    <AuthStatePanel
      icon={AlertTriangle}
      title={t("authError")}
      description={t("authErrorDescription")}
    >
      {onRetry && (
        <Button variant="outline" size="lg" onClick={onRetry}>
          {t("retry")}
        </Button>
      )}
      <Link
        href={routes.login}
        className={cn(buttonVariants({ variant: "ghost", size: "lg" }), "gap-2")}
      >
        <LogIn className="size-4" />
        {t("signIn")}
      </Link>
    </AuthStatePanel>
  );
}

/**
 * Loading skeleton for auth state resolution.
 */
export function AuthLoading() {
  const { t } = useTranslation("authStates");

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="size-8 animate-spin rounded-full border-4 border-muted border-t-foreground" />
        <p className="text-sm text-muted-foreground">{t("verifyingAccess")}</p>
      </div>
    </div>
  );
}
