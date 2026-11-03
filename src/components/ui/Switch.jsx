import { motion } from "framer-motion";
import { cn } from "../../utils/cn";

export function Switch({ checked, onChange, label, description, disabled, className }) {
  return (
    <div className={cn("flex items-start justify-between gap-4", className)}>
      {(label || description) && (
        <div className="min-w-0">
          {label && <p className="text-sm font-semibold text-slate-800">{label}</p>}
          {description && <p className="mt-0.5 text-xs text-slate-500">{description}</p>}
        </div>
      )}
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full px-0.5 transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-electric-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          checked ? "justify-end bg-electric-500" : "justify-start bg-slate-300"
        )}
      >
        <motion.span layout transition={{ type: "spring", stiffness: 600, damping: 32 }} className="h-5 w-5 rounded-full bg-white shadow" />
      </button>
    </div>
  );
}
