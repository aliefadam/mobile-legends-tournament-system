import { motion } from "framer-motion";
import { cn } from "../../utils/cn";
import { Icon } from "./Icon";

/** steps: [{key,label,icon}]; current: index; onStepClick(index) hanya untuk step yang sudah dilalui */
export function Stepper({ steps, current, onStepClick }) {
  return (
    <ol className="flex items-start">
      {steps.map((s, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={s.key} className="relative flex flex-1 flex-col items-center">
            {i > 0 && (
              <span className="absolute left-[-50%] right-[50%] top-5 h-0.5 bg-slate-200">
                <motion.span className="block h-full bg-electric-500" initial={false} animate={{ width: i <= current ? "100%" : "0%" }} transition={{ duration: 0.4 }} />
              </span>
            )}
            <button
              type="button"
              disabled={!done}
              onClick={() => done && onStepClick?.(i)}
              className={cn(
                "relative z-10 flex h-10 w-10 items-center justify-center rounded-full border-2 text-base transition-colors",
                done && "cursor-pointer border-electric-500 bg-electric-500 text-white",
                active && "border-electric-500 bg-white text-electric-600 ring-4 ring-electric-100",
                !done && !active && "border-slate-200 bg-white text-slate-400"
              )}
            >
              <Icon name={done ? "check" : s.icon} />
            </button>
            <span className={cn("mt-2 hidden text-center text-xs font-semibold sm:block", active ? "text-electric-600" : done ? "text-slate-700" : "text-slate-400")}>{s.label}</span>
          </li>
        );
      })}
    </ol>
  );
}
