import { useId } from "react";
import { motion } from "framer-motion";
import { cn } from "../../utils/cn";
import { Icon } from "./Icon";

/** tabs: [{value, label, icon, count}] */
export function Tabs({ tabs, value, onChange, className, variant = "underline" }) {
  const gid = useId();
  if (variant === "pill")
    return (
      <div role="tablist" className={cn("scrollbar-none inline-flex max-w-full gap-1 overflow-x-auto overflow-y-hidden rounded-xl bg-slate-100 p-1", className)}>
        {tabs.map((t) => (
          <button
            key={t.value}
            role="tab"
            aria-selected={value === t.value}
            onClick={() => onChange(t.value)}
            className={cn("relative whitespace-nowrap rounded-lg px-4 py-2 text-sm font-semibold transition-colors", value === t.value ? "text-navy-900" : "text-slate-500 hover:text-slate-800")}
          >
            {value === t.value && <motion.span layoutId={`pill-${gid}`} className="absolute inset-0 rounded-lg bg-white shadow-sm" transition={{ type: "spring", stiffness: 500, damping: 36 }} />}
            <span className="relative flex items-center gap-2">
              {t.icon && <Icon name={t.icon} />}
              {t.label}
            </span>
          </button>
        ))}
      </div>
    );
  return (
    <div role="tablist" className={cn("scrollbar-none flex gap-1 overflow-x-auto overflow-y-hidden border-b border-slate-200", className)}>
      {tabs.map((t) => (
        <button
          key={t.value}
          role="tab"
          aria-selected={value === t.value}
          onClick={() => onChange(t.value)}
          className={cn("relative flex shrink-0 items-center gap-2 whitespace-nowrap px-4 py-3 text-sm font-semibold transition-colors", value === t.value ? "text-electric-600" : "text-slate-500 hover:text-slate-800")}
        >
          {t.icon && <Icon name={t.icon} />}
          {t.label}
          {t.count !== undefined && (
            <span className={cn("rounded-full px-2 py-0.5 text-[11px]", value === t.value ? "bg-electric-100 text-electric-700" : "bg-slate-100 text-slate-500")}>{t.count}</span>
          )}
          {value === t.value && <motion.span layoutId={`ul-${gid}`} className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-electric-500" transition={{ type: "spring", stiffness: 500, damping: 36 }} />}
        </button>
      ))}
    </div>
  );
}
