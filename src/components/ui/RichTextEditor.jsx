import { useEffect, useRef } from "react";
import { cn } from "../../utils/cn";
import { sanitizeRichText } from "../../utils/richText";
import { FormField } from "./Input";

const controls = [
  { command: "bold", label: "B", title: "Tebal", className: "font-extrabold" },
  { command: "italic", label: "I", title: "Miring", className: "italic" },
  { command: "underline", label: "U", title: "Garis bawah", className: "underline" },
  { command: "insertUnorderedList", label: "• Daftar", title: "Daftar poin" },
  { command: "insertOrderedList", label: "1. Daftar", title: "Daftar bernomor" },
];

export function RichTextEditor({ label, value, onChange, hint, placeholder, wrapperClassName }) {
  const editorRef = useRef(null);

  useEffect(() => {
    const editor = editorRef.current;
    if (editor && document.activeElement !== editor) {
      const safeValue = sanitizeRichText(value || "");
      if (editor.innerHTML !== safeValue) editor.innerHTML = safeValue;
    }
  }, [value]);

  const format = (command) => {
    const editor = editorRef.current;
    if (!editor) return;
    editor.focus();
    editor.ownerDocument.execCommand(command, false);
    onChange(editor.innerHTML);
  };

  return (
    <FormField label={label} hint={hint} className={wrapperClassName}>
      <div className="overflow-hidden rounded-xl border border-slate-300 bg-white transition focus-within:border-electric-500 focus-within:ring-4 focus-within:ring-electric-100">
        <div className="flex flex-wrap gap-1 border-b border-slate-200 bg-slate-50 p-2" role="toolbar" aria-label="Format peraturan">
          {controls.map((control) => (
            <button
              key={control.command}
              type="button"
              title={control.title}
              aria-label={control.title}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => format(control.command)}
              className={cn("min-h-8 rounded-md px-2.5 text-xs text-slate-700 transition hover:bg-electric-50 hover:text-electric-700", control.className)}
            >
              {control.label}
            </button>
          ))}
        </div>
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          role="textbox"
          aria-label={label}
          aria-multiline="true"
          data-placeholder={placeholder}
          onInput={(event) => onChange(event.currentTarget.innerHTML)}
          onBlur={(event) => onChange(sanitizeRichText(event.currentTarget.innerHTML))}
          className="min-h-40 px-3.5 py-3 text-sm leading-relaxed text-slate-900 outline-none empty:before:pointer-events-none empty:before:text-slate-400 empty:before:content-[attr(data-placeholder)] [&_div]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-2 [&_ul]:list-disc [&_ul]:pl-5"
        />
      </div>
    </FormField>
  );
}
