import { cn } from "../../utils/cn";

const TONES = {
  neutral: "bg-slate-100 text-slate-600 ring-slate-200",
  success: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  warning: "bg-amber-50 text-amber-700 ring-amber-200",
  danger: "bg-red-50 text-red-700 ring-red-200",
  info: "bg-electric-50 text-electric-700 ring-electric-200",
  purple: "bg-accent-50 text-accent-700 ring-accent-200",
  dark: "bg-slate-100 text-slate-700 ring-slate-200",
};
const DOTS = {
  neutral: "bg-slate-400",
  success: "bg-emerald-500",
  warning: "bg-amber-500",
  danger: "bg-red-500",
  info: "bg-electric-500",
  purple: "bg-accent-500",
  dark: "bg-slate-500",
};

export function Badge({ tone = "neutral", dot = true, children, className }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset", TONES[tone], className)}>
      {dot && <span className={cn("h-1.5 w-1.5 rounded-full", DOTS[tone])} />}
      {children}
    </span>
  );
}
