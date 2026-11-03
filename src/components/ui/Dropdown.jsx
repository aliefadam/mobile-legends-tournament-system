import { cloneElement, useCallback, useRef, useState } from "react";
import { cn } from "../../utils/cn";
import { Icon } from "./Icon";
import { Popover } from "./Popover";

/** items: [{label, icon, onClick, danger, disabled, divider}] */
export function Dropdown({ trigger, items, align = "right", width = 208 }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const close = useCallback(() => setOpen(false), []);
  const visible = items.filter(Boolean);
  return (
    <>
      <span ref={ref} className="inline-flex" onClick={(e) => e.stopPropagation()}>
        {cloneElement(trigger, { onClick: () => setOpen((o) => !o), "aria-haspopup": "menu", "aria-expanded": open })}
      </span>
      <Popover open={open} anchorRef={ref} onClose={close} align={align} width={width}>
        <div className="p-1.5" role="menu">
          {visible.map((it, i) =>
            it.divider ? (
              <div key={i} className="my-1 h-px bg-slate-100" />
            ) : (
              <button
                key={i}
                role="menuitem"
                disabled={it.disabled}
                onClick={() => {
                  setOpen(false);
                  it.onClick?.();
                }}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40",
                  it.danger ? "text-red-600 hover:bg-red-50" : "text-slate-700 hover:bg-slate-100"
                )}
              >
                {it.icon && <Icon name={it.icon} className="text-base opacity-80" />}
                {it.label}
              </button>
            )
          )}
        </div>
      </Popover>
    </>
  );
}
