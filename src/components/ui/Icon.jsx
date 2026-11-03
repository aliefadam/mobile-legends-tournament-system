import { cn } from "../../utils/cn";

/** Flaticon UIcons (CDN). style: "rr" regular-rounded | "sr" solid-rounded */
export function Icon({ name, solid = false, className, ...rest }) {
  return <i className={cn(`fi fi-${solid ? "sr" : "rr"}-${name}`, "inline-flex items-center justify-center leading-none", className)} aria-hidden="true" {...rest} />;
}
