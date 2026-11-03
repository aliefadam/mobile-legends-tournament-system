import { useId } from "react";

const short = (s, n = 12) => (s.length > n ? s.slice(0, n - 1) + "…" : s);

export function BarChart({ data, color = "#2f6bff" }) {
  const W = 560;
  const H = 230;
  const pad = { l: 34, r: 10, t: 14, b: 42 };
  const max = Math.max(1, ...data.map((d) => d.value));
  const niceMax = Math.ceil(max / 2) * 2 || 2;
  const bw = (W - pad.l - pad.r) / Math.max(1, data.length);
  const id = useId();
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Grafik batang">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} />
          <stop offset="100%" stopColor="#7c3aed" />
        </linearGradient>
      </defs>
      {[0, 0.5, 1].map((t) => {
        const y = pad.t + (H - pad.t - pad.b) * (1 - t);
        return (
          <g key={t}>
            <line x1={pad.l} x2={W - pad.r} y1={y} y2={y} stroke="#e2e8f0" strokeDasharray="4 4" />
            <text x={pad.l - 8} y={y + 4} textAnchor="end" fontSize="11" fill="#94a3b8">{Math.round(niceMax * t)}</text>
          </g>
        );
      })}
      {data.map((d, i) => {
        const h = ((H - pad.t - pad.b) * d.value) / niceMax;
        const x = pad.l + i * bw + bw * 0.2;
        const y = H - pad.b - h;
        return (
          <g key={d.label}>
            <rect x={x} y={y} width={bw * 0.6} height={Math.max(h, 0)} rx="6" fill={`url(#${id})`}>
              <title>{`${d.label}: ${d.value}`}</title>
            </rect>
            <text x={x + bw * 0.3} y={y - 6} textAnchor="middle" fontSize="12" fontWeight="700" fill="#334155">{d.value}</text>
            <text x={x + bw * 0.3} y={H - pad.b + 18} textAnchor="middle" fontSize="11" fill="#64748b">{short(d.label, Math.max(8, Math.floor(bw / 7)))}</text>
          </g>
        );
      })}
    </svg>
  );
}

export function DonutChart({ data, centerLabel }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const R = 70;
  const C = 2 * Math.PI * R;
  let offset = 0;
  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row sm:justify-center">
      <svg viewBox="0 0 200 200" className="h-44 w-44 shrink-0" role="img" aria-label="Grafik donat">
        <circle cx="100" cy="100" r={R} fill="none" stroke="#f1f5f9" strokeWidth="28" />
        {total > 0 &&
          data.map((d) => {
            const len = (d.value / total) * C;
            const el = (
              <circle key={d.label} cx="100" cy="100" r={R} fill="none" stroke={d.color} strokeWidth="28" strokeDasharray={`${len} ${C - len}`} strokeDashoffset={-offset} transform="rotate(-90 100 100)">
                <title>{`${d.label}: ${d.value}`}</title>
              </circle>
            );
            offset += len;
            return el;
          })}
        <text x="100" y="100" textAnchor="middle" fontSize="30" fontWeight="800" fill="#0a1128">{total}</text>
        <text x="100" y="120" textAnchor="middle" fontSize="11" fill="#94a3b8">{centerLabel}</text>
      </svg>
      <ul className="w-full space-y-2.5 sm:w-auto">
        {data.map((d) => (
          <li key={d.label} className="flex items-center gap-3 text-sm">
            <span className="h-3 w-3 rounded-full" style={{ background: d.color }} />
            <span className="text-slate-600">{d.label}</span>
            <span className="ml-auto pl-6 font-bold text-slate-900">{d.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function AreaChart({ data, color = "#7c3aed", valueFormatter = (value) => String(value), label = "Grafik area" }) {
  const W = 560;
  const H = 230;
  const pad = { l: 34, r: 14, t: 16, b: 34 };
  const id = useId();
  const max = Math.max(2, ...data.map((d) => d.value));
  const step = data.length > 1 ? (W - pad.l - pad.r) / (data.length - 1) : 0;
  const pts = data.map((d, i) => [pad.l + i * step, pad.t + (H - pad.t - pad.b) * (1 - d.value / max), d]);
  const line = pts.map((p, i) => `${i ? "L" : "M"}${p[0]},${p[1]}`).join(" ");
  const area = pts.length ? `${line} L${pts[pts.length - 1][0]},${H - pad.b} L${pts[0][0]},${H - pad.b} Z` : "";
  const every = Math.ceil(data.length / 7);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img" aria-label={label}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0, 0.5, 1].map((t) => {
        const y = pad.t + (H - pad.t - pad.b) * (1 - t);
        return (
          <g key={t}>
            <line x1={pad.l} x2={W - pad.r} y1={y} y2={y} stroke="#e2e8f0" strokeDasharray="4 4" />
            <text x={pad.l - 8} y={y + 4} textAnchor="end" fontSize="11" fill="#94a3b8">{valueFormatter(Math.round(max * t))}</text>
          </g>
        );
      })}
      <path d={area} fill={`url(#${id})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
      {pts.map(([x, y, d], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r="4" fill="#fff" stroke={color} strokeWidth="2.5"><title>{`${d.label}: ${valueFormatter(d.value)}`}</title></circle>
          {i % every === 0 && <text x={x} y={H - pad.b + 20} textAnchor="middle" fontSize="11" fill="#64748b">{d.label}</text>}
        </g>
      ))}
    </svg>
  );
}
