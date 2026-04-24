/**
 * Navigation utilities — react-router-dom equivalents replacing next-intl navigation.
 *
 * Exports a compatibility Link component that accepts both `href` and `to` props
 * so existing code using `href=` (next-intl style) continues to work without changes.
 */
export { NavLink } from "react-router-dom";

import * as React from "react";
import { Link as RRLink, type LinkProps } from "react-router-dom";
import { useLocation, useNavigate } from "react-router-dom";

// Compatibility Link: accepts either `href` or `to` (next-intl used href)
type CompatLinkProps = Omit<LinkProps, "to"> & {
  to?: string;
  href?: string;
};

export const Link = React.forwardRef<HTMLAnchorElement, CompatLinkProps>(
  ({ href, to, ...rest }, ref) => {
    const destination = (to ?? href) as string;
    return <RRLink ref={ref} to={destination} {...rest} />;
  },
);
Link.displayName = "Link";

export function usePathname(): string {
  return useLocation().pathname;
}

export function useRouter() {
  const navigate = useNavigate();
  return {
    push: (href: string) => navigate(href),
    replace: (href: string) => navigate(href, { replace: true }),
    back: () => navigate(-1),
    forward: () => navigate(1),
    refresh: () => window.location.reload(),
  };
}

