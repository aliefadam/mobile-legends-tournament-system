import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Icon } from "../components/ui/Icon";
import { STORAGE_ERROR_EVENT } from "../services/storage";
import { cn } from "../utils/cn";

const ToastContext = createContext(null);

const TONES = {
  success: { icon: "check-circle", bar: "bg-emerald-500", iconCls: "text-emerald-500 bg-emerald-50" },
  error: { icon: "cross-circle", bar: "bg-red-500", iconCls: "text-red-500 bg-red-50" },
  warning: { icon: "exclamation", bar: "bg-amber-500", iconCls: "text-amber-500 bg-amber-50" },
  info: { icon: "info", bar: "bg-electric-500", iconCls: "text-electric-500 bg-electric-50" },
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const counter = useRef(0);

  const remove = useCallback((id) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  const push = useCallback(
    (type, message, title) => {
      const id = ++counter.current;
      setToasts((t) => [...t.slice(-3), { id, type, message, title }]);
      setTimeout(() => remove(id), 4200);
    },
    [remove]
  );

  const api = useMemo(
    () => ({
      success: (m, t) => push("success", m, t),
      error: (m, t) => push("error", m, t),
      warning: (m, t) => push("warning", m, t),
      info: (m, t) => push("info", m, t),
    }),
    [push]
  );

  useEffect(() => {
    const handler = (event) => push("error", event.detail?.message || "Gagal menyimpan data. Silakan coba lagi.", "Gagal menyimpan");
    window.addEventListener(STORAGE_ERROR_EVENT, handler);
    return () => window.removeEventListener(STORAGE_ERROR_EVENT, handler);
  }, [push]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-0 z-[200] flex flex-col items-center gap-2 p-4 sm:items-end">
        <AnimatePresence initial={false}>
          {toasts.map((t) => {
            const tone = TONES[t.type];
            return (
              <motion.div
                key={t.id}
                layout
                initial={{ opacity: 0, y: -16, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, x: 40, scale: 0.96 }}
                transition={{ type: "spring", stiffness: 420, damping: 32 }}
                className="pointer-events-auto relative flex w-full max-w-sm items-start gap-3 overflow-hidden rounded-xl border border-slate-200 bg-white p-3.5 pr-9 shadow-xl shadow-navy-900/10"
              >
                <span className={cn("absolute inset-y-0 left-0 w-1", tone.bar)} />
                <span className={cn("mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", tone.iconCls)}>
                  <Icon name={tone.icon} />
                </span>
                <div className="min-w-0 text-sm">
                  {t.title && <p className="font-semibold text-slate-900">{t.title}</p>}
                  <p className={cn("text-slate-600", !t.title && "font-medium text-slate-800")}>{t.message}</p>
                </div>
                <button
                  onClick={() => remove(t.id)}
                  className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-md text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                  aria-label="Tutup"
                >
                  <Icon name="cross-small" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
