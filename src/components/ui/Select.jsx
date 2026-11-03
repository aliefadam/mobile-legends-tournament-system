import { useCallback, useEffect, useId, useRef, useState } from "react";
import { cn } from "../../utils/cn";
import { FormField, fieldBase } from "./Input";
import { Icon } from "./Icon";
import { Popover } from "./Popover";

export function Select({ label, value, onChange, options, placeholder = "Pilih...", error, hint, required, disabled, size = "md", className, wrapperClassName }) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const ref = useRef(null);
  const listRef = useRef(null);
  const id = useId();
  const selected = options.find((o) => o.value === value);
  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (open) setActive(Math.max(0, options.findIndex((o) => o.value === value)));
  }, [open]); // eslint-disable-line

  useEffect(() => {
    if (!open || active < 0) return;
    listRef.current?.querySelector(`[data-idx="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active, open]);

  const choose = (o) => {
    if (o.disabled) return;
    onChange(o.value);
    setOpen(false);
  };

  const onKeyDown = (e) => {
    if (disabled) return;
    if (!open && ["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) {
      e.preventDefault();
      setOpen(true);
      return;
    }
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(options.length - 1, a + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(0, a - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (options[active]) choose(options[active]);
    }
  };

  return (
    <FormField label={label} error={error} hint={hint} required={required} htmlFor={id} className={wrapperClassName}>
      <button
        id={id}
        ref={ref}
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={onKeyDown}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={cn(fieldBase(error, disabled), "flex items-center justify-between gap-2 text-left", size === "sm" ? "h-10 px-3" : "h-11 px-3.5", open && "border-electric-500 ring-4 ring-electric-100", className)}
      >
        <span className={cn("flex min-w-0 items-center gap-2 truncate", !selected && "text-slate-400")}>
          {selected?.icon && <Icon name={selected.icon} className="text-slate-500" />}
          <span className="truncate">{selected ? selected.label : placeholder}</span>
        </span>
        <Icon name="angle-small-down" className={cn("shrink-0 text-lg text-slate-400 transition-transform", open && "rotate-180")} />
      </button>
      <Popover open={open} anchorRef={ref} onClose={close} matchWidth>
        <ul ref={listRef} role="listbox" className="p-1.5">
          {options.length === 0 && <li className="px-3 py-3 text-center text-sm text-slate-400">Tidak ada pilihan</li>}
          {options.map((o, i) => (
            <li
              key={o.value}
              data-idx={i}
              role="option"
              aria-selected={o.value === value}
              onMouseEnter={() => setActive(i)}
              onClick={() => choose(o)}
              className={cn(
                "flex cursor-pointer items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-sm transition-colors",
                i === active && "bg-slate-100",
                o.value === value ? "font-semibold text-electric-600" : "text-slate-700",
                o.disabled && "cursor-not-allowed opacity-40"
              )}
            >
              <span className="flex min-w-0 items-center gap-2">
                {o.icon && <Icon name={o.icon} />}
                <span className="min-w-0">
                  <span className="block truncate">{o.label}</span>
                  {o.description && <span className="block truncate text-xs font-normal text-slate-400">{o.description}</span>}
                </span>
              </span>
              {o.value === value && <Icon name="check" className="shrink-0" />}
            </li>
          ))}
        </ul>
      </Popover>
    </FormField>
  );
}
