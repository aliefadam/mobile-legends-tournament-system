import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button, Tooltip } from "../ui";
import { BracketSvg } from "./BracketSvg";
import { computeLayout } from "../../services/bracket";
import { useToast } from "../../contexts/ToastContext";
import { cn } from "../../utils/cn";
import { downloadFile } from "../../utils/format";

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

export function BracketViewer({ bracket, matches, onMatchClick, title, extraTools }) {
  const toast = useToast();
  const layout = useMemo(() => computeLayout(bracket, matches), [bracket, matches]);
  const wrapRef = useRef(null);
  const containerRef = useRef(null);
  const svgRef = useRef(null);
  const [view, setView] = useState({ x: 20, y: 20, s: 1 });
  const [full, setFull] = useState(false);
  const pointers = useRef(new Map());
  const drag = useRef({ active: false, moved: false, sx: 0, sy: 0, vx: 0, vy: 0, pinch: 0 });

  const fit = useCallback(() => {
    const c = containerRef.current;
    if (!c) return;
    const cw = c.clientWidth;
    const ch = c.clientHeight;
    let s = Math.min(cw / layout.width, ch / layout.height, 1);
    if (s < 0.4) return setView({ s: 0.4, x: 12, y: 12 });
    setView({ s, x: (cw - layout.width * s) / 2, y: Math.max(8, (ch - layout.height * s) / 2) });
  }, [layout.width, layout.height]);

  useEffect(() => {
    const id = requestAnimationFrame(fit);
    return () => cancelAnimationFrame(id);
  }, [fit, bracket.id, bracket.created_at, full]);

  const zoomAt = useCallback((factor, cx, cy) => {
    setView((v) => {
      const s = clamp(v.s * factor, 0.25, 2.5);
      const k = s / v.s;
      return { s, x: cx - (cx - v.x) * k, y: cy - (cy - v.y) * k };
    });
  }, []);
  const zoomCenter = (f) => {
    const c = containerRef.current;
    zoomAt(f, c.clientWidth / 2, c.clientHeight / 2);
  };

  // Wheel: ctrl/cmd = zoom, shift/horizontal = pan
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const r = el.getBoundingClientRect();
        zoomAt(e.deltaY < 0 ? 1.1 : 0.9, e.clientX - r.left, e.clientY - r.top);
      } else if (e.shiftKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
        e.preventDefault();
        const d = e.shiftKey && !e.deltaX ? e.deltaY : e.deltaX;
        setView((v) => ({ ...v, x: v.x - d }));
      }
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [zoomAt]);

  // Fullscreen
  useEffect(() => {
    const onChange = () => setFull(document.fullscreenElement === wrapRef.current);
    document.addEventListener("fullscreenchange", onChange);
    return () => {
      document.removeEventListener("fullscreenchange", onChange);
    };
  }, []);
  const toggleFull = async () => {
    try {
      if (document.fullscreenElement === wrapRef.current) {
        await document.exitFullscreen();
      } else {
        if (!document.fullscreenEnabled || !wrapRef.current?.requestFullscreen) {
          toast.error("Mode fullscreen tidak didukung oleh browser ini.");
          return;
        }
        await wrapRef.current.requestFullscreen();
      }
    } catch {
      toast.error("Tidak dapat mengubah mode fullscreen. Coba lagi.");
    }
  };

  // Drag & pinch
  const onPointerDown = (e) => {
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const d = drag.current;
    if (pointers.current.size === 1) Object.assign(d, { active: true, moved: false, sx: e.clientX, sy: e.clientY, vx: view.x, vy: view.y });
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      d.pinch = Math.hypot(a.x - b.x, a.y - b.y);
      d.moved = true;
    }
  };
  const onPointerMove = (e) => {
    const d = drag.current;
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      if (d.pinch) {
        const r = containerRef.current.getBoundingClientRect();
        zoomAt(dist / d.pinch, (a.x + b.x) / 2 - r.left, (a.y + b.y) / 2 - r.top);
      }
      d.pinch = dist;
      return;
    }
    if (!d.active) return;
    const dx = e.clientX - d.sx;
    const dy = e.clientY - d.sy;
    if (!d.moved && Math.hypot(dx, dy) > 5) d.moved = true;
    if (d.moved) setView((v) => ({ ...v, x: d.vx + dx, y: d.vy + dy }));
  };
  const onPointerUp = (e) => {
    pointers.current.delete(e.pointerId);
    const d = drag.current;
    if (pointers.current.size === 0) {
      d.active = false;
      d.pinch = 0;
      setTimeout(() => (d.moved = false), 0);
    } else if (pointers.current.size === 1) {
      const p = [...pointers.current.values()][0];
      Object.assign(d, { sx: p.x, sy: p.y, vx: view.x, vy: view.y, pinch: 0 });
    }
  };

  const handleMatch = (m) => {
    if (drag.current.moved) return;
    onMatchClick?.(m);
  };

  const buildSvgString = () => {
    const clone = svgRef.current.cloneNode(true);
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    const bg = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    bg.setAttribute("width", layout.width);
    bg.setAttribute("height", layout.height);
    bg.setAttribute("fill", "#f8fafc");
    clone.insertBefore(bg, clone.firstChild);
    return new XMLSerializer().serializeToString(clone);
  };

  const exportPng = () => {
    try {
      const svg = buildSvgString();
      const img = new Image();
      const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }));
      img.onload = () => {
        const scale = 2;
        const canvas = document.createElement("canvas");
        canvas.width = layout.width * scale;
        canvas.height = layout.height * scale;
        const ctx = canvas.getContext("2d");
        ctx.scale(scale, scale);
        ctx.drawImage(img, 0, 0);
        URL.revokeObjectURL(url);
        canvas.toBlob((blob) => {
          if (!blob) return toast.error("Gagal membuat PNG.");
          downloadFile(`bracket-${bracket.tournament_id}.png`, blob);
          toast.success("Bracket diekspor sebagai PNG.");
        }, "image/png");
      };
      img.onerror = () => toast.error("Gagal membuat PNG.");
      img.src = url;
    } catch {
      toast.error("Gagal mengekspor bracket.");
    }
  };

  const printBracket = () => {
    const w = window.open("", "_blank", "width=1100,height=800");
    if (!w) return toast.error("Pop-up diblokir browser. Izinkan pop-up untuk mencetak.");
    w.document.write(`<html><head><title>${title || "Bracket"}</title><style>body{margin:16px;font-family:sans-serif}svg{max-width:100%;height:auto}@page{size:landscape;margin:10mm}</style></head><body><h2>${title || "Bracket"}</h2>${buildSvgString()}</body></html>`);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 400);
  };

  return (
    <div ref={wrapRef} className={cn("flex flex-col border border-slate-200 bg-white", full ? "h-screen w-screen rounded-none" : "rounded-2xl")}>
      <div className={cn("relative z-10 flex flex-wrap items-center gap-2 border-b border-slate-100 bg-white px-3 py-2.5", !full && "rounded-t-2xl")}>
        <p className="mr-auto truncate px-1 text-sm font-bold text-slate-800">{title}</p>
        {extraTools}
        <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1">
          <Tooltip label="Zoom Out"><Button variant="ghost" size="icon" className="h-8 w-8" icon="zoom-out" onClick={() => zoomCenter(0.85)} aria-label="Zoom out" /></Tooltip>
          <span className="w-11 text-center text-xs font-bold text-slate-600">{Math.round(view.s * 100)}%</span>
          <Tooltip label="Zoom In"><Button variant="ghost" size="icon" className="h-8 w-8" icon="zoom-in" onClick={() => zoomCenter(1.15)} aria-label="Zoom in" /></Tooltip>
        </div>
        <Tooltip label="Fit to Screen"><Button variant="outline" size="icon" icon="compress-alt" onClick={fit} aria-label="Fit to screen" /></Tooltip>
        <Tooltip label="Export PNG"><Button variant="outline" size="icon" icon="download" onClick={exportPng} aria-label="Export PNG" /></Tooltip>
        <Tooltip label="Print"><Button variant="outline" size="icon" icon="print" onClick={printBracket} aria-label="Print" /></Tooltip>
        <Tooltip label={full ? "Keluar Fullscreen" : "Fullscreen"}><Button variant="outline" size="icon" icon={full ? "compress" : "expand"} onClick={toggleFull} aria-label="Fullscreen" /></Tooltip>
      </div>
      <div
        ref={containerRef}
        className={cn("bracket-canvas relative select-none overflow-hidden", full ? "flex-1" : "h-[68vh] min-h-[420px] rounded-b-2xl")}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onPointerLeave={onPointerUp}
      >
        <div style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.s})`, transformOrigin: "0 0", transition: drag.current.active ? "none" : "transform 0.18s ease-out", width: layout.width, height: layout.height }} className="absolute left-0 top-0 will-change-transform">
          <BracketSvg layout={layout} bracket={bracket} matches={matches} onMatchClick={handleMatch} svgRef={svgRef} />
        </div>
        <p className="pointer-events-none absolute bottom-2 left-3 hidden text-[11px] font-medium text-slate-400 sm:block">Seret untuk menggeser · Ctrl + scroll untuk zoom · Shift + scroll untuk geser horizontal</p>
      </div>
    </div>
  );
}
