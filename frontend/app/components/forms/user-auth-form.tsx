import * as React from "react";
import { Icons } from "@flowconsole/ui/components/shared/icons";
import { buttonVariants } from "@flowconsole/ui/components/ui/button";
import { Input } from "@flowconsole/ui/components/ui/input";
import { Label } from "@flowconsole/ui/components/ui/label";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";

import { ApiError } from "@/lib/api/error";
import {
  toApiError,
  useLoginMutation,
  useRegisterMutation,
} from "@/lib/api/rtk";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { ossAuthSchema } from "@/lib/validations/auth";

interface UserAuthFormProps extends React.HTMLAttributes<HTMLDivElement> {
  type?: string;
}

interface FormData {
  email: string;
  password: string;
}

export function UserAuthForm({ className, type, ...props }: UserAuthFormProps) {
  const { t } = useTranslation("auth");
  const navigate = useNavigate();
  const { login } = useAuth();
  const [registerUser] = useRegisterMutation();
  const [loginUser] = useLoginMutation();

  const resolver = zodResolver(ossAuthSchema) as ReturnType<typeof zodResolver>;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver });

  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const [searchParams] = useSearchParams();

  // Only allow same-origin relative paths to prevent open redirect attacks.
  const rawCallback = searchParams?.get("callbackUrl") ?? "";
  const safeCallbackUrl =
    rawCallback.startsWith("/") && !rawCallback.startsWith("//")
      ? rawCallback
      : "/dashboard";

  async function onSubmit(data: FormData) {
    setIsLoading(true);

    try {
      let response;
      if (type === "register") {
        response = await registerUser({
          registerRequest: {
            email: data.email.toLowerCase(),
            password: data.password,
          },
        }).unwrap();
      } else {
        response = await loginUser({
          loginRequest: {
            email: data.email.toLowerCase(),
            password: data.password,
          },
        }).unwrap();
      }
      await login(response.accessToken, response.refreshToken);
      navigate(safeCallbackUrl);
    } catch (err) {
      setIsLoading(false);
      const apiError = toApiError(err);
      if (apiError instanceof ApiError && apiError.isUnauthorized) {
        toast.error(t("invalidCredentials"), {
          description: t("invalidCredentialsDescription"),
        });
      } else {
        toast.error(t("signInError"), {
          description: t("signInErrorDescription"),
        });
      }
    }
  }

  return (
    <div className={cn("grid gap-6", className)} {...props}>
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="grid gap-2">
          <div className="grid gap-1">
            <Label className="sr-only" htmlFor="email">
              {t("email")}
            </Label>
            <Input
              id="email"
              data-testid="email-input"
              placeholder={t("emailPlaceholder")}
              type="email"
              autoCapitalize="none"
              autoComplete="email"
              autoCorrect="off"
              disabled={isLoading}
              {...register("email")}
            />
            {errors?.email && (
              <p
                className="px-1 text-xs text-red-600"
                data-testid="email-error"
              >
                {errors.email.message}
              </p>
            )}
          </div>

          <div className="grid gap-1">
            <Label className="sr-only" htmlFor="password">
              {t("password")}
            </Label>
            <Input
              id="password"
              data-testid="password-input"
              placeholder={t("passwordPlaceholder")}
              type="password"
              data-openreplay-obscured
              autoComplete={
                type === "register" ? "new-password" : "current-password"
              }
              disabled={isLoading}
              {...register("password")}
            />
            {errors?.password && (
              <p
                className="px-1 text-xs text-red-600"
                data-testid="password-error"
              >
                {errors.password.message}
              </p>
            )}
          </div>

          <button
            className={cn(buttonVariants())}
            disabled={isLoading}
            data-testid="submit-button"
          >
            {isLoading && (
              <Icons.spinner className="mr-2 size-4 animate-spin" />
            )}
            {type === "register" ? t("signUpWithEmail") : t("signInWithEmail")}
          </button>
        </div>
      </form>
    </div>
  );
}
