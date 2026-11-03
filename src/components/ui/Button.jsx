import { forwardRef } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { cn } from "../../utils/cn";
import { Icon } from "./Icon";

const VARIANTS = {
  primary: "bg-electric-500 text-white shadow-sm shadow-electric-500/30 hover:bg-electric-600 disabled:hover:bg-electric-500",
  accent: "bg-accent-500 text-white shadow-sm shadow-accent-500/30 hover:bg-accent-600",
  dark: "border border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200",
  outline: "border border-slate-300 bg-white text-slate-700 hover:border-electric-400 hover:text-electric-600",
  ghost: "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
  soft: "bg-electric-50 text-electric-700 hover:bg-electric-100",
  success: "bg-emerald-500 text-white shadow-sm shadow-emerald-500/30 hover:bg-emerald-600",
  danger: "bg-red-500 text-white shadow-sm shadow-red-500/30 hover:bg-red-600",
  "danger-soft": "bg-red-50 text-red-600 hover:bg-red-100",
  light: "border border-slate-200 bg-white text-electric-700 shadow-sm hover:bg-electric-50",
};
const SIZES = {
  xs: "h-7 px-2.5 text-xs gap-1.5 rounded-lg",
  sm: "h-9 px-3.5 text-sm gap-2 rounded-lg",
  md: "h-11 px-5 text-sm gap-2 rounded-xl",
  lg: "h-12 px-6 text-base gap-2.5 rounded-xl",
  icon: "h-9 w-9 rounded-lg",
};

export const Button = forwardRef(function Button(
  { variant = "primary", size = "md", icon, iconRight, loading, disabled, full, to, href, className, children, type = "button", ...rest },
  ref
) {
  const cls = cn(
    "relative inline-flex select-none items-center justify-center whitespace-nowrap font-semibold transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-electric-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
    VARIANTS[variant],
    SIZES[size],
    full && "w-full",
    className
  );
  const content = (
    <>
      {loading ? <Icon name="spinner" className="animate-spin" /> : icon && <Icon name={icon} />}
      {children}
      {iconRight && !loading && <Icon name={iconRight} />}
    </>
  );
  if (to)
    return (
      <Link ref={ref} to={to} className={cls} {...rest}>
        {content}
      </Link>
    );
  if (href)
    return (
      <a ref={ref} href={href} className={cls} {...rest}>
        {content}
      </a>
    );
  return (
    <motion.button
      ref={ref}
      type={type}
      whileTap={disabled || loading ? undefined : { scale: 0.97 }}
      disabled={disabled || loading}
      className={cls}
      {...rest}
    >
      {content}
    </motion.button>
  );
});
