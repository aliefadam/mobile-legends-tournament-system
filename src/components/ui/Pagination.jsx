import { cn } from "../../utils/cn";
import { Icon } from "./Icon";

function pages(current, total) {
  if (total <= 6) return Array.from({ length: total }, (_, i) => i + 1);
  const set = new Set([1, total, current, current - 1, current + 1]);
  const arr = [...set].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
  const out = [];
  arr.forEach((p, i) => {
    if (i && p - arr[i - 1] > 1) out.push("…" + p);
    out.push(p);
  });
  return out;
}

export function Pagination({ page, pageSize, total, onChange }) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (total <= pageSize) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  const btn = "flex h-9 min-w-9 items-center justify-center rounded-lg px-2 text-sm font-semibold transition-colors";
  return (
    <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 sm:flex-row">
      <p className="text-xs text-slate-500">
        Menampilkan <b className="text-slate-700">{from}–{to}</b> dari <b className="text-slate-700">{total}</b> data
      </p>
      <div className="flex items-center gap-1">
        <button className={cn(btn, "text-slate-500 hover:bg-slate-100 disabled:opacity-40")} disabled={page <= 1} onClick={() => onChange(page - 1)} aria-label="Sebelumnya">
          <Icon name="angle-small-left" className="text-lg" />
        </button>
        {pages(page, totalPages).map((p) =>
          typeof p === "string" ? (
            <span key={p} className="px-1 text-slate-400">…</span>
          ) : (
            <button key={p} onClick={() => onChange(p)} className={cn(btn, p === page ? "bg-electric-500 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100")}>
              {p}
            </button>
          )
        )}
        <button className={cn(btn, "text-slate-500 hover:bg-slate-100 disabled:opacity-40")} disabled={page >= totalPages} onClick={() => onChange(page + 1)} aria-label="Berikutnya">
          <Icon name="angle-small-right" className="text-lg" />
        </button>
      </div>
    </div>
  );
}
