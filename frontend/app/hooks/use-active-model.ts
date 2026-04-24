import { useMemo } from "react";
import { usePathname } from "@/i18n/navigation";

export type ActiveModel = {
  modelId: string;
  modelTitle: string;
};

export type ActiveProject = {
  projectId: string;
};

export function useActiveModel(): ActiveModel | null {
  const pathname = usePathname();

  return useMemo(() => {
    const pathMatch = pathname.match(/^\/models\/([^/]+)/);
    if (pathMatch) {
      return { modelId: pathMatch[1], modelTitle: pathMatch[1] };
    }
    return null;
  }, [pathname]);
}

export function useActiveProject(): ActiveProject | null {
  const pathname = usePathname();

  return useMemo(() => {
    const pathMatch = pathname.match(/^\/projects\/([^/]+)/);
    if (pathMatch) {
      return { projectId: pathMatch[1] };
    }
    return null;
  }, [pathname]);
}
