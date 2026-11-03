import { motion } from "framer-motion";
import { cn } from "../../utils/cn";
import { Icon } from "./Icon";

export function Checkbox({ checked, onChange, label, description, disabled, error, className }) {
  return (
    <div className={className}>
      <label className={cn("flex cursor-pointer items-start gap-3", disabled && "cursor-not-allowed opacity-50")}>
        <button
          type="button"
          role="checkbox"
          aria-checked={checked}
          disabled={disabled}
          onClick={() => onChange(!checked)}
          className={cn(
            "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 text-xs text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-electric-400 focus-visible:ring-offset-2",
            checked ? "border-electric-500 bg-electric-500" : error ? "border-red-400 bg-white" : "border-slate-300 bg-white hover:border-electric-400"
          )}
        >
          <motion.span initial={false} animate={{ scale: checked ? 1 : 0, opacity: checked ? 1 : 0 }} transition={{ duration: 0.12 }}>
            <Icon name="check" className="text-[10px]" />
          </motion.span>
        </button>
        <span className="text-sm text-slate-700" onClick={() => !disabled && onChange(!checked)}>
          <span className="font-medium">{label}</span>
          {description && <span className="mt-0.5 block text-xs text-slate-500">{description}</span>}
        </span>
      </label>
      {error && <p className="mt-1.5 text-xs font-medium text-red-600">{error}</p>}
    </div>
  );
}

/** options: [{value, label, description, icon, disabled}] — tampil sebagai kartu pilihan */
export function RadioGroup({ value, onChange, options, columns = 2, className, variant = "card" }) {
  return (
    <div role="radiogroup" className={cn("grid gap-3", columns === 3 ? "sm:grid-cols-3" : columns === 2 ? "sm:grid-cols-2" : "", className)}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={on}
            disabled={o.disabled}
            onClick={() => onChange(o.value)}
            className={cn(
              "flex items-start gap-3 rounded-xl border-2 p-3.5 text-left transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-electric-400 disabled:cursor-not-allowed disabled:opacity-50",
              variant === "plain" && "border-slate-200 p-3",
              on ? "border-electric-500 bg-electric-50/60 shadow-sm" : "border-slate-200 bg-white hover:border-slate-300"
            )}
          >
            <span className={cn("mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors", on ? "border-electric-500" : "border-slate-300")}>
              <motion.span initial={false} animate={{ scale: on ? 1 : 0 }} transition={{ type: "spring", stiffness: 500, damping: 30 }} className="h-2.5 w-2.5 rounded-full bg-electric-500" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                {o.icon && <Icon name={o.icon} className="text-electric-500" />}
                {o.label}
              </span>
              {o.description && <span className="mt-0.5 block text-xs text-slate-500">{o.description}</span>}
            </span>
          </button>
        );
      })}
    </div>
  );
}
