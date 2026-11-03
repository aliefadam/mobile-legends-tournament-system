import { useCallback, useId, useRef, useState } from "react";
import { cn } from "../../utils/cn";
import { FormField, fieldBase } from "./Input";
import { Icon } from "./Icon";
import { Popover } from "./Popover";

const two = (n) => String(n).padStart(2, "0");

export function TimePicker({ label, value, onChange, placeholder = "Pilih jam mulai", error, hint, required, disabled }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const id = useId();
  const close = useCallback(() => setOpen(false), []);
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value || "");
  const hour = match ? Number(match[1]) : null;
  const minute = match ? Number(match[2]) : null;

  const update = (nextHour, nextMinute) => onChange(`${two(nextHour)}:${two(nextMinute)}`);

  return (
    <FormField label={label} error={error} hint={hint} required={required} htmlFor={id}>
      <div className="relative">
        <button
          id={id}
          ref={ref}
          type="button"
          disabled={disabled}
          aria-haspopup="dialog"
          aria-expanded={open}
          onClick={() => setOpen((current) => !current)}
          className={cn(fieldBase(error, disabled), "flex h-11 items-center gap-2.5 px-3.5 text-left", open && "border-electric-500 ring-4 ring-electric-100")}
        >
          <Icon name="clock" className="text-slate-400" />
          <span className={cn("flex-1", !match && "text-slate-400")}>{match ? `${match[1]}:${match[2]}` : placeholder}</span>
        </button>
      </div>
      <Popover open={open} anchorRef={ref} onClose={close} width={300} maxHeight={390}>
        <div className="p-3">
          <div className="mb-3">
            <p className="text-sm font-bold text-slate-800">Pilih jam mulai</p>
            <p className="mt-0.5 text-xs text-slate-500">Gunakan format waktu 24 jam</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <TimeColumn
              label="Jam"
              values={Array.from({ length: 24 }, (_, i) => i)}
              current={hour}
              onPick={(nextHour) => update(nextHour, minute ?? 0)}
            />
            <TimeColumn
              label="Menit"
              values={Array.from({ length: 60 }, (_, i) => i)}
              current={minute}
              onPick={(nextMinute) => update(hour ?? 0, nextMinute)}
            />
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
            {match ? (
              <button type="button" onClick={() => onChange("")} className="rounded-lg px-2 py-1.5 text-xs font-semibold text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700">
                Hapus
              </button>
            ) : <span className="text-xs text-slate-500">Belum ada waktu dipilih</span>}
            <button type="button" onClick={close} className="rounded-lg bg-electric-500 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-electric-600">
              Selesai
            </button>
          </div>
        </div>
      </Popover>
    </FormField>
  );
}

function TimeColumn({ label, values, current, onPick }) {
  return (
    <div>
      <p className="mb-1.5 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <div className="thin-scroll h-52 overflow-y-auto rounded-lg bg-slate-50 p-1">
        {values.map((value) => (
          <button
            key={value}
            type="button"
            aria-pressed={value === current}
            onClick={() => onPick(value)}
            className={cn(
              "my-0.5 flex h-8 w-full items-center justify-center rounded-md text-sm font-medium transition-colors",
              value === current ? "bg-electric-500 text-white shadow-sm" : "text-slate-600 hover:bg-white hover:text-electric-600"
            )}
          >
            {two(value)}
          </button>
        ))}
      </div>
    </div>
  );
}
