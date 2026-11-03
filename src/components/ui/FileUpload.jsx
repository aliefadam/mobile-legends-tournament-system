import { useRef, useState } from "react";
import { cn } from "../../utils/cn";
import { FILE_RULES } from "../../constants";
import { compressImage, formatBytes } from "../../utils/format";
import { FormField } from "./Input";
import { Icon } from "./Icon";
import { Button } from "./Button";
import { ImageViewer } from "./ImageViewer";

export function validateImageFile(file) {
  if (!file) return "File tidak ditemukan.";
  if (!FILE_RULES.types.includes(file.type)) return "Format file harus JPG, JPEG, PNG, atau WEBP.";
  if (file.size > FILE_RULES.maxSize) return `Ukuran file maksimal 5 MB (file Anda ${formatBytes(file.size)}).`;
  if (file.size === 0) return "File kosong.";
  return null;
}

/** value: {name,size,dataUrl} | null */
export function FileUpload({ label, value, onChange, error, hint, required, onReject, compress = { maxDim: 1000, quality: 0.78 }, className }) {
  const inputRef = useRef(null);
  const [drag, setDrag] = useState(false);
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState("");
  const [zoom, setZoom] = useState(false);

  const handle = async (file) => {
    const err = validateImageFile(file);
    if (err) {
      setLocalError(err);
      onReject?.(err);
      return;
    }
    setLocalError("");
    setBusy(true);
    try {
      const dataUrl = await compressImage(file, compress);
      onChange({ name: file.name, size: file.size, type: file.type, dataUrl });
    } catch {
      setLocalError("Gagal memproses gambar.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const shownError = localError || error;
  return (
    <FormField label={label} error={shownError} hint={hint} required={required} className={className}>
      <input ref={inputRef} type="file" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => handle(e.target.files?.[0])} />
      {value?.dataUrl ? (
        <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-slate-50 p-3 sm:flex-row sm:items-center">
          <button type="button" onClick={() => setZoom(true)} className="group relative h-40 w-full shrink-0 overflow-hidden rounded-lg bg-white sm:h-28 sm:w-28" aria-label="Perbesar gambar">
            <img src={value.dataUrl} alt="Pratinjau" className="h-full w-full object-cover" />
            <span className="absolute inset-0 flex items-center justify-center bg-white/80 text-xl text-electric-700 opacity-0 transition-opacity group-hover:opacity-100">
              <Icon name="zoom-in" />
            </span>
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-slate-800">{value.name}</p>
            <p className="text-xs text-slate-500">{formatBytes(value.size)}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button size="xs" variant="outline" icon="refresh" onClick={() => inputRef.current?.click()} loading={busy}>
                Upload Ulang
              </Button>
              <Button size="xs" variant="danger-soft" icon="trash" onClick={() => onChange(null)}>
                Hapus
              </Button>
            </div>
          </div>
          <ImageViewer src={value.dataUrl} open={zoom} onClose={() => setZoom(false)} />
        </div>
      ) : (
        <div
          role="button"
          tabIndex={0}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDrag(true);
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDrag(false);
            handle(e.dataTransfer.files?.[0]);
          }}
          className={cn(
            "flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-8 text-center transition-colors focus:outline-none focus-visible:ring-4 focus-visible:ring-electric-100",
            drag ? "border-electric-500 bg-electric-50" : shownError ? "border-red-300 bg-red-50/40" : "border-slate-300 bg-slate-50 hover:border-electric-400 hover:bg-electric-50/40"
          )}
        >
          <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-white text-xl text-electric-500 shadow-sm">
            <Icon name={busy ? "spinner" : "cloud-upload"} className={busy ? "animate-spin" : ""} />
          </span>
          <p className="text-sm font-semibold text-slate-700">{busy ? "Memproses gambar..." : "Klik atau seret gambar ke sini"}</p>
          <p className="mt-1 text-xs text-slate-500">JPG, JPEG, PNG, WEBP · maksimal 5 MB</p>
        </div>
      )}
    </FormField>
  );
}
