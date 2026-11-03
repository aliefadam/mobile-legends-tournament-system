import { useCallback, useId, useMemo, useRef, useState } from "react";
import { cn } from "../../utils/cn";
import { DAYS_ID, MONTHS_ID, formatDate, parseDate, toISODate } from "../../utils/format";
import { FormField, fieldBase } from "./Input";
import { Icon } from "./Icon";
import { Popover } from "./Popover";

const sameDay = (a, b) => a && b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
const two = (n) => String(n).padStart(2, "0");

/**
 * value: "YYYY-MM-DD" atau "YYYY-MM-DDTHH:mm" bila withTime.
 */
export function DatePicker({ label, value, onChange, placeholder = "Pilih tanggal", error, hint, required, withTime, min, disabled }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const id = useId();
  const close = useCallback(() => setOpen(false), []);
  const [datePart, timePart] = (value || "").split("T");
  const selected = parseDate(datePart);
  const [h, m] = (timePart || "09:00").split(":").map(Number);
  const [view, setView] = useState(() => selected || new Date());

  const today = new Date();
  const minDate = min ? parseDate(min) : null;

  const days = useMemo(() => {
    const y = view.getFullYear();
    const mo = view.getMonth();
    const first = new Date(y, mo, 1).getDay();
    const count = new Date(y, mo + 1, 0).getDate();
    return [...Array(first).fill(null), ...Array.from({ length: count }, (_, i) => new Date(y, mo, i + 1))];
  }, [view]);

  const emit = (d, hh = h, mm = m) => onChange(withTime ? `${toISODate(d)}T${two(hh)}:${two(mm)}` : toISODate(d));
  const pick = (d) => {
    emit(d);
    if (!withTime) setOpen(false);
  };

  const display = selected ? (withTime ? `${formatDate(selected)}, ${two(h)}:${two(m)}` : formatDate(selected)) : "";

  return (
    <FormField label={label} error={error} hint={hint} required={required} htmlFor={id}>
      <div className="relative">
        <button
          id={id}
          ref={ref}
          type="button"
          disabled={disabled}
          onClick={() => {
            if (selected) setView(selected);
            setOpen((o) => !o);
          }}
          className={cn(fieldBase(error, disabled), "flex h-11 items-center gap-2.5 px-3.5 text-left", open && "border-electric-500 ring-4 ring-electric-100")}
        >
          <Icon name="calendar" className="text-slate-400" />
          <span className={cn("flex-1 truncate", !display && "text-slate-400")}>{display || placeholder}</span>
          {value && !disabled && (
            <span
              role="button"
              aria-label="Hapus tanggal"
              onClick={(e) => {
                e.stopPropagation();
                onChange("");
              }}
              className="flex h-6 w-6 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            >
              <Icon name="cross-small" />
            </span>
          )}
        </button>
      </div>
      <Popover open={open} anchorRef={ref} onClose={close} width={withTime ? 376 : 300} maxHeight={420}>
        <div className="flex">
          <div className="w-[300px] shrink-0 p-3">
            <div className="mb-2 flex items-center justify-between">
              <button type="button" onClick={() => setView(new Date(view.getFullYear(), view.getMonth() - 1, 1))} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100" aria-label="Bulan sebelumnya">
                <Icon name="angle-small-left" className="text-lg" />
              </button>
              <p className="text-sm font-bold text-slate-800">
                {MONTHS_ID[view.getMonth()]} {view.getFullYear()}
              </p>
              <button type="button" onClick={() => setView(new Date(view.getFullYear(), view.getMonth() + 1, 1))} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100" aria-label="Bulan berikutnya">
                <Icon name="angle-small-right" className="text-lg" />
              </button>
            </div>
            <div className="grid grid-cols-7 text-center">
              {DAYS_ID.map((d) => (
                <span key={d} className="py-1.5 text-[11px] font-semibold uppercase text-slate-400">
                  {d}
                </span>
              ))}
              {days.map((d, i) => {
                if (!d) return <span key={i} />;
                const isSel = sameDay(d, selected);
                const disabledDay = minDate && d < minDate;
                return (
                  <button
                    key={i}
                    type="button"
                    disabled={disabledDay}
                    onClick={() => pick(d)}
                    className={cn(
                      "mx-auto my-0.5 flex h-9 w-9 items-center justify-center rounded-lg text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:text-slate-300",
                      isSel ? "bg-electric-500 text-white shadow-md shadow-electric-500/30" : sameDay(d, today) ? "bg-electric-50 font-bold text-electric-600" : "text-slate-700 hover:bg-slate-100"
                    )}
                  >
                    {d.getDate()}
                  </button>
                );
              })}
            </div>
            <div className="mt-2 flex justify-between border-t border-slate-100 pt-2">
              <button type="button" onClick={() => pick(new Date())} className="rounded-md px-2 py-1 text-xs font-semibold text-electric-600 hover:bg-electric-50">
                Hari ini
              </button>
              {withTime && (
                <button type="button" onClick={close} className="rounded-md bg-electric-500 px-3 py-1 text-xs font-semibold text-white hover:bg-electric-600">
                  Selesai
                </button>
              )}
            </div>
          </div>
          {withTime && (
            <div className="flex shrink-0 border-l border-slate-100">
              <TimeColumn values={Array.from({ length: 24 }, (_, i) => i)} current={h} onPick={(v) => selected && emit(selected, v, m)} disabled={!selected} />
              <TimeColumn values={[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55]} current={m} onPick={(v) => selected && emit(selected, h, v)} disabled={!selected} />
            </div>
          )}
        </div>
      </Popover>
    </FormField>
  );
}

function TimeColumn({ values, current, onPick, disabled }) {
  return (
    <div className="thin-scroll h-[340px] w-[34px] overflow-y-auto py-2">
      {values.map((v) => (
        <button
          key={v}
          type="button"
          disabled={disabled}
          onClick={() => onPick(v)}
          className={cn("mx-auto my-0.5 flex h-8 w-8 items-center justify-center rounded-lg text-xs font-semibold transition-colors disabled:opacity-40", v === current ? "bg-electric-500 text-white" : "text-slate-600 hover:bg-slate-100")}
        >
          {two(v)}
        </button>
      ))}
    </div>
  );
}
