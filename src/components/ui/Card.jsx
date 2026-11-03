import { motion } from "framer-motion";
import { cn } from "../../utils/cn";

export function Card({ className, hover, children, ...rest }) {
  const base = "rounded-2xl border border-slate-200/80 bg-white shadow-sm shadow-navy-900/[0.03]";
  if (hover)
    return (
      <motion.div whileHover={{ y: -4 }} transition={{ type: "spring", stiffness: 300, damping: 24 }} className={cn(base, "transition-shadow hover:shadow-xl hover:shadow-navy-900/10", className)} {...rest}>
        {children}
      </motion.div>
    );
  return (
    <div className={cn(base, className)} {...rest}>
      {children}
    </div>
  );
}

export function CardHeader({ title, description, action, className }) {
  return (
    <div className={cn("flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-5 py-4", className)}>
      <div className="min-w-0">
        <h3 className="text-base font-bold text-slate-900">{title}</h3>
        {description && <p className="mt-0.5 text-sm text-slate-500">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function StatCard({ icon, label, value, tone = "info", hint }) {
  const tones = {
    info: "bg-electric-50 text-electric-600",
    success: "bg-emerald-50 text-emerald-600",
    warning: "bg-amber-50 text-amber-600",
    purple: "bg-accent-50 text-accent-600",
    danger: "bg-red-50 text-red-600",
  };
  return (
    <Card hover className="p-5">
      <div className="flex items-center gap-4">
        <span className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-xl", tones[tone])}>
          <i className={`fi fi-rr-${icon}`} />
        </span>
        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-slate-500">{label}</p>
          <p className="truncate text-xl font-bold text-slate-900 sm:text-2xl">{value}</p>
          {hint && <p className="truncate text-xs text-slate-400">{hint}</p>}
        </div>
      </div>
    </Card>
  );
}
