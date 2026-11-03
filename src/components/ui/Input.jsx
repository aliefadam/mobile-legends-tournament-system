import { forwardRef, useId } from "react";
import { cn } from "../../utils/cn";
import { Icon } from "./Icon";

export function FormField({ label, error, hint, required, htmlFor, children, className, right }) {
  return (
    <div className={cn("w-full", className)}>
      {(label || right) && (
        <div className="mb-1.5 flex items-center justify-between gap-2">
          {label && (
            <label htmlFor={htmlFor} className="text-sm font-semibold text-slate-700">
              {label}
              {required && <span className="ml-0.5 text-red-500">*</span>}
            </label>
          )}
          {right}
        </div>
      )}
      {children}
      {error ? (
        <p className="mt-1.5 flex items-start gap-1.5 text-xs font-medium text-red-600">
          <Icon name="exclamation" className="mt-0.5" />
          {error}
        </p>
      ) : (
        hint && <p className="mt-1.5 text-xs text-slate-500">{hint}</p>
      )}
    </div>
  );
}

export const fieldBase = (error, disabled) =>
  cn(
    "w-full rounded-xl border bg-white text-sm text-slate-900 placeholder:text-slate-400 transition duration-150 focus:outline-none",
    error
      ? "border-red-400 focus:border-red-500 focus:ring-4 focus:ring-red-100"
      : "border-slate-300 hover:border-slate-400 focus:border-electric-500 focus:ring-4 focus:ring-electric-100",
    disabled && "cursor-not-allowed bg-slate-100 text-slate-500"
  );

export const Input = forwardRef(function Input(
  { label, error, hint, required, icon, prefix, suffix, className, wrapperClassName, disabled, id, type = "text", ...rest },
  ref
) {
  const auto = useId();
  const fid = id || auto;
  return (
    <FormField label={label} error={error} hint={hint} required={required} htmlFor={fid} className={wrapperClassName}>
      <div className="relative flex items-center">
        {icon && <Icon name={icon} className="pointer-events-none absolute left-3.5 text-base text-slate-400" />}
        {prefix && <span className="pointer-events-none absolute left-3.5 text-sm font-semibold text-slate-500">{prefix}</span>}
        <input
          ref={ref}
          id={fid}
          type={type}
          disabled={disabled}
          aria-invalid={!!error}
          className={cn(fieldBase(error, disabled), "h-11 px-3.5", icon && "pl-10", prefix && "pl-11", suffix && "pr-11", className)}
          {...rest}
        />
        {suffix && <span className="absolute right-2 flex items-center">{suffix}</span>}
      </div>
    </FormField>
  );
});

export const Textarea = forwardRef(function Textarea({ label, error, hint, required, className, wrapperClassName, id, rows = 4, ...rest }, ref) {
  const auto = useId();
  const fid = id || auto;
  return (
    <FormField label={label} error={error} hint={hint} required={required} htmlFor={fid} className={wrapperClassName}>
      <textarea ref={ref} id={fid} rows={rows} aria-invalid={!!error} className={cn(fieldBase(error), "resize-y px-3.5 py-3", className)} {...rest} />
    </FormField>
  );
});

export function SearchInput({ value, onChange, placeholder = "Cari...", className }) {
  return (
    <div className={cn("relative", className)}>
      <Icon name="search" className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(fieldBase(false), "h-10 pl-10 pr-9")}
      />
      {value && (
        <button
          onClick={() => onChange("")}
          className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          aria-label="Hapus pencarian"
        >
          <Icon name="cross-small" />
        </button>
      )}
    </div>
  );
}
